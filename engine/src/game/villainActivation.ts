import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
import { drawFromEncounterDeck } from "./encounterDeck";
import { getCardDefinition } from "../data/cards";
import { getScenarioForState } from "../scenarios";
import { advanceMainSchemeIfComplete } from "../game/mainScheme";
import { activeVillainFace, adjustEnvironmentCounters } from "./villainFaces";

/**
 * Roba y descarta las cartas de aumento de UNA activación y devuelve la suma
 * de sus iconos. Casi todos los villanos roban 1; Klaw roba 2 (Interrupción
 * obligada). Se lee del escenario; por defecto 1 si no está registrado.
 */
function drawBoostCards(state: GameState): {
  state: GameState;
  events: GameEvent[];
  boostValue: number;
} {
  const scenario = getScenarioForState(state);
  const boostCardCount = scenario?.boostCardsPerActivation ?? 1;
  let currentState = state;
  let events: GameEvent[] = [];
  let boostValue = 0;
  for (let i = 0; i < boostCardCount; i++) {
    const {
      state: afterBoostDraw,
      cardId: boostCardId,
      events: boostDrawEvents,
    } = drawFromEncounterDeck(currentState);
    currentState = afterBoostDraw;
    events = [...events, ...boostDrawEvents];
    if (boostCardId) {
      boostValue += getCardDefinition(boostCardId)?.boost ?? 0;
      currentState = {
        ...currentState,
        encounterDiscard: [...currentState.encounterDiscard, boostCardId],
      };
      events.push({
        type: "BOOST_CARD_REVEALED",
        cardId: boostCardId,
        boostValue: getCardDefinition(boostCardId)?.boost ?? 0,
      });
    }
  }
  return { state: currentState, events, boostValue };
}

export function resolveVillainActivation(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Jugador no encontrado: ${playerId}`);
  }
  let currentState = state;
  let events: GameEvent[] = [];

  // Interrupciones obligadas que SUSTITUYEN la activación por mover contadores
  // del Entorno (Negocios arriesgados): Norman no ataca, coloca Infamia; el
  // Duende Verde no maquina, quita Locura. Como el ataque/plan no llega a
  // ocurrir, no se le da carta de aumento.
  const face = activeVillainFace(currentState);
  const replacedAttack =
    player.form === "HERO"
      ? (face?.attackPlacesEnvironmentCounters ?? 0)
      : 0;
  const replacedScheme =
    player.form !== "HERO"
      ? (face?.schemeRemovesEnvironmentCounters ?? 0)
      : 0;

  if (
    (replacedAttack > 0 || replacedScheme > 0) &&
    currentState.environment !== undefined
  ) {
    const delta = replacedAttack > 0 ? replacedAttack : -replacedScheme;
    events.push({
      type: "VILLAIN_ACTIVATION_REPLACED",
      villainName: currentState.villain.name,
      replaced: replacedAttack > 0 ? "ATTACK" : "SCHEME",
      counterName: currentState.environment.counterName,
      delta,
    });
    const { state: afterCounters, events: counterEvents } =
      adjustEnvironmentCounters(currentState, delta);
    currentState = afterCounters;
    events = [...events, ...counterEvents];
    if (replacedAttack > 0) {
      // El jugador en forma de Héroe recibe su carta de encuentro igual que
      // cuando el villano ataca (mismo criterio que la rama de ataque).
      const { state: afterQueue } = applyEffects(currentState, [
        { type: "QUEUE_ENCOUNTER_CARD", playerId },
      ]);
      currentState = afterQueue;
    }
  } else {
    const {
      state: afterBoost,
      events: boostEvents,
      boostValue,
    } = drawBoostCards(currentState);
    currentState = afterBoost;
    events = [...events, ...boostEvents];

    if (player.form === "HERO") {
      const amount = currentState.villain.attack + boostValue;
      const { state: afterEffects, events: effectEvents } = applyEffects(
        currentState,
        [
          {
            type: "DEAL_DAMAGE",
            target: { kind: "PLAYER", playerId },
            amount,
            source: "villain",
          },
          { type: "QUEUE_ENCOUNTER_CARD", playerId },
        ],
      );
      currentState = afterEffects;
      events = [
        ...events,
        { type: "VILLAIN_ATTACKED", playerId, amount },
        ...effectEvents,
      ];
      // Respuesta obligada "después de que el villano ataque y te inflija
      // daño, coloca N de amenaza sobre el plan principal" (La fórmula
      // mutagénica). El motor no modela defensores: el daño del ataque es
      // el ATQ + aumento.
      const threatAfter = face?.threatAfterDamagingAttack ?? 0;
      if (amount > 0 && threatAfter > 0) {
        const { state: afterThreat, events: threatEvents } = applyEffects(
          currentState,
          [
            {
              type: "ADD_THREAT",
              target: { kind: "MAIN_SCHEME" },
              amount: threatAfter,
            },
          ],
        );
        currentState = afterThreat;
        events = [...events, ...threatEvents];
      }
    } else {
      const mainScheme = currentState.schemes.find((s) => s.isMain)!;
      const amount = currentState.villain.scheme + boostValue;
      const { state: afterEffects, events: effectEvents } = applyEffects(
        currentState,
        [{ type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount }],
      );
      currentState = afterEffects;
      events = [
        ...events,
        { type: "VILLAIN_SCHEMED", schemeId: mainScheme.id, amount },
        ...effectEvents,
      ];
    }
  }

  const engagedMinions = currentState.minions.filter(
    (m) => m.engagedWith === playerId,
  );
  for (const minion of engagedMinions) {
    const { state: afterMinion, events: minionEvents } = applyEffects(
      currentState,
      [
        {
          type: "DEAL_DAMAGE",
          target: { kind: "PLAYER", playerId },
          amount: minion.attack,
          source: minion.name,
        },
        { type: "QUEUE_ENCOUNTER_CARD", playerId },
      ],
    );
    currentState = afterMinion;
    events = [...events, ...minionEvents];
  }
  // Si el villano planificó (en alter ego) y con ello el plan principal llegó
  // a su umbral, avanza a la siguiente etapa (planes multi-etapa como Klaw).
  const { state: afterAdvance, events: advanceEvents } =
    advanceMainSchemeIfComplete(currentState);
  currentState = afterAdvance;
  events = [...events, ...advanceEvents];
  return { state: currentState, events };
}

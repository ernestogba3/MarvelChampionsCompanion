import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
import { drawFromEncounterDeck } from "./encounterDeck";
import { getCardDefinition } from "../data/cards";
import { getScenarioByVillainName } from "../scenarios";
import { advanceMainSchemeIfComplete } from "./mainScheme";

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

  // Cuántas cartas de aumento roba el villano en esta activación. Casi todos
  // roban 1; Klaw roba 2 (Interrupción obligada). Se lee del escenario; por
  // defecto 1 si el villano no está registrado. El valor de aumento total es
  // la suma de los iconos de todas las cartas reveladas.
  const scenario = getScenarioByVillainName(currentState.villain.name);
  const boostCardCount = scenario?.boostCardsPerActivation ?? 1;

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

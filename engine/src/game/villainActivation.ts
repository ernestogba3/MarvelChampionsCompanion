import type { GameState, VillainState } from "../domain/types";
import type { GameEvent } from "../events/types";
import type { Effect } from "../effects/types";
import { applyEffects } from "../effects/applyEffect";
import { drawFromEncounterDeck } from "./encounterDeck";
import { getCardDefinition } from "../data/cards";
import { getScenarioForState } from "../scenarios";
import { advanceMainSchemeIfComplete } from "../game/mainScheme";
import { adjustEnvironmentCounters, villainFaceOf } from "./villainFaces";
import { ownSideScheme, resolveSignatureSchemeOverflows } from "./multiVillain";
import {
  attachmentAttackBonus,
  consumeOneShotAttackAttachments,
} from "./villainDamage";

/**
 * Roba y descarta las cartas de aumento de UNA activación y devuelve la suma
 * de sus iconos. Casi todos los villanos roban 1; Klaw roba 2 (Interrupción
 * obligada). Se lee del escenario; por defecto 1 si no está registrado. Salen
 * siempre del mazo de encuentros del villano activo (en The Wrecking Crew,
 * aunque ataque otro villano).
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

export interface VillainActOptions {
  /** +N de ATQ o PLA para esta activación (p.ej. "+2 ATQ si es Resistente"). */
  bonus?: number;
  /** Si recibe carta de aumento (por defecto sí). */
  drawBoost?: boolean;
  /**
   * Si el jugador recibe una carta de encuentro por este ataque. La activación
   * de la fase del villano la reparte; los ataques de tratados, no.
   */
  queueEncounterCard?: boolean;
}

/**
 * Un villano (el activo o, en The Wrecking Crew, cualquiera) ataca a un
 * jugador. Resuelve las habilidades de su cara: la Interrupción de Norman que
 * sustituye el ataque por Infamia, +N ATQ si no es defendido (el motor no
 * modela defensores), daño extra tras atacar y amenaza tras un ataque con
 * daño. Suma el ATQ de sus acopladas (Embestida, Cuerno de marfil) y, al
 * final del ataque, descarta las que se gastan al atacar. Devuelve el daño
 * del ataque (0 si se sustituyó).
 */
export function villainAttacks(
  state: GameState,
  villain: VillainState,
  playerId: string,
  options: VillainActOptions = {},
): { state: GameState; events: GameEvent[]; damage: number } {
  const face = villainFaceOf(state, villain);
  let currentState = state;
  let events: GameEvent[] = [];

  // Interrupción obligada que sustituye el ataque por colocar contadores
  // (Norman Osborn). Como el ataque no llega a ocurrir, no hay aumento.
  const replaced = face?.attackPlacesEnvironmentCounters ?? 0;
  if (replaced > 0 && currentState.environment !== undefined) {
    events.push({
      type: "VILLAIN_ACTIVATION_REPLACED",
      villainName: villain.name,
      replaced: "ATTACK",
      counterName: currentState.environment.counterName,
      delta: replaced,
    });
    const counters = adjustEnvironmentCounters(currentState, replaced);
    currentState = counters.state;
    events = [...events, ...counters.events];
    if (options.queueEncounterCard === true) {
      // El jugador recibe su carta de encuentro igual que si le atacara.
      currentState = applyEffects(currentState, [
        { type: "QUEUE_ENCOUNTER_CARD", playerId },
      ]).state;
    }
    return { state: currentState, events, damage: 0 };
  }

  let boostValue = 0;
  if (options.drawBoost !== false) {
    const boost = drawBoostCards(currentState);
    currentState = boost.state;
    events = [...events, ...boost.events];
    boostValue = boost.boostValue;
  }

  const amount =
    villain.attack +
    attachmentAttackBonus(villain) +
    boostValue +
    (options.bonus ?? 0) +
    (face?.attackBonusIfUndefended ?? 0);
  const effects: Effect[] = [
    {
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId },
      amount,
      source: "villain",
    },
  ];
  if (options.queueEncounterCard === true) {
    effects.push({ type: "QUEUE_ENCOUNTER_CARD", playerId });
  }
  const attacked = applyEffects(currentState, effects);
  currentState = attacked.state;
  events = [
    ...events,
    { type: "VILLAIN_ATTACKED", playerId, amount },
    ...attacked.events,
  ];
  // "Al final de este ataque, descarta la Embestida". Las acopladas
  // modeladas solo están en el villano activo (se acoplan al revelarse).
  if (villain.villainId === currentState.villain.villainId) {
    const consumed = consumeOneShotAttackAttachments(currentState);
    currentState = consumed.state;
    events = [...events, ...consumed.events];
  }

  // Respuesta obligada "después de que el villano ataque y te inflija daño,
  // coloca N de amenaza sobre el plan principal" (La fórmula mutagénica).
  const threatAfter = face?.threatAfterDamagingAttack ?? 0;
  // Respuesta obligada "después de que te ataque, inflige N de daño a cada
  // personaje que controles" (Bola de Trueno; a la identidad).
  const damageAfter = face?.damageAfterAttack ?? 0;
  const after: Effect[] = [];
  if (amount > 0 && threatAfter > 0) {
    after.push({
      type: "ADD_THREAT",
      target: { kind: "MAIN_SCHEME" },
      amount: threatAfter,
    });
  }
  if (damageAfter > 0) {
    after.push({
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId },
      amount: damageAfter,
      source: villain.name,
    });
  }
  if (after.length > 0) {
    const applied = applyEffects(currentState, after);
    currentState = applied.state;
    events = [...events, ...applied.events];
  }
  return { state: currentState, events, damage: amount };
}

/**
 * Un villano maquina. Resuelve las habilidades de su cara: la Interrupción del
 * Duende Verde que la sustituye por quitar Locura, y "coloca la amenaza en su
 * plan secundario en vez de en el principal" (The Wrecking Crew, que además
 * puede disparar el efecto de ese plan al llegar a 10). Devuelve la amenaza
 * colocada (0 si se sustituyó).
 */
export function villainSchemes(
  state: GameState,
  villain: VillainState,
  options: VillainActOptions = {},
): { state: GameState; events: GameEvent[]; threat: number } {
  const face = villainFaceOf(state, villain);
  let currentState = state;
  let events: GameEvent[] = [];

  const replaced = face?.schemeRemovesEnvironmentCounters ?? 0;
  if (replaced > 0 && currentState.environment !== undefined) {
    events.push({
      type: "VILLAIN_ACTIVATION_REPLACED",
      villainName: villain.name,
      replaced: "SCHEME",
      counterName: currentState.environment.counterName,
      delta: -replaced,
    });
    const counters = adjustEnvironmentCounters(currentState, -replaced);
    return {
      state: counters.state,
      events: [...events, ...counters.events],
      threat: 0,
    };
  }

  let boostValue = 0;
  if (options.drawBoost !== false) {
    const boost = drawBoostCards(currentState);
    currentState = boost.state;
    events = [...events, ...boost.events];
    boostValue = boost.boostValue;
  }

  const amount = villain.scheme + boostValue + (options.bonus ?? 0);
  const own =
    face?.schemesOnOwnSideScheme === true
      ? ownSideScheme(currentState, villain.villainId)
      : undefined;
  const target = own ?? currentState.schemes.find((s) => s.isMain)!;
  const placed = applyEffects(currentState, [
    {
      type: "ADD_THREAT",
      target:
        own !== undefined
          ? { kind: "SCHEME", schemeId: own.id }
          : { kind: "MAIN_SCHEME" },
      amount,
    },
  ]);
  currentState = placed.state;
  events = [
    ...events,
    { type: "VILLAIN_SCHEMED", schemeId: target.id, amount },
    ...placed.events,
  ];
  const overflow = resolveSignatureSchemeOverflows(currentState);
  return {
    state: overflow.state,
    events: [...events, ...overflow.events],
    threat: amount,
  };
}

export function resolveVillainActivation(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Jugador no encontrado: ${playerId}`);
  }

  // El villano activo ataca al jugador en forma de Héroe (que recibe su carta
  // de encuentro) o maquina si está en alter ego.
  const acted =
    player.form === "HERO"
      ? villainAttacks(state, state.villain, playerId, {
          queueEncounterCard: true,
        })
      : villainSchemes(state, state.villain);
  let currentState = acted.state;
  let events = acted.events;

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

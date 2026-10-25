import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { getCardDefinition } from "../data/cards";
import { createHydraMercenary, createSandman, createShocker } from "./minions";
import {
  createArmoredRhinoSuit,
  createCharge,
  createEnhancedIvoryHorn,
} from "./attachments";

const MINION_FACTORIES: Record<
  string,
  (id: string, engagedWith: string | null) => ReturnType<typeof createSandman>
> = {
  "01101": createHydraMercenary,
  "01102": createSandman,
  "01103": createShocker,
};
const ATTACHMENT_FACTORIES: Record<
  string,
  (id: string) => ReturnType<typeof createCharge>
> = {
  "01098": createArmoredRhinoSuit,
  "01099": createCharge,
  "01100": createEnhancedIvoryHorn,
};

/**
 * Id que no colisiona con ninguno de `taken`: `base` si está libre; si no,
 * `base-2`, `base-3`… (p.ej. dos copias del mismo plan secundario en juego,
 * o un esbirro nuevo tras derrotar a otro con el mismo índice).
 */
function uniqueId(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function putCardIntoPlay(
  state: GameState,
  cardId: string,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const def = getCardDefinition(cardId);
  if (!def) {
    return { state, events: [] };
  }
  if (def.type === "MINION") {
    const factory = MINION_FACTORIES[cardId];
    const id = uniqueId(
      `${cardId}-${state.minions.length}`,
      state.minions.map((m) => m.id),
    );
    const minion = factory
      ? factory(id, playerId)
      : {
          id,
          cardId,
          name: def.nameEs,
          attack: def.attack ?? 0,
          scheme: def.scheme ?? 0,
          health: def.health ?? 1,
          maxHealth: def.health ?? 1,
          engagedWith: playerId,
          tough: false,
          guard: def.guard ?? false,
        };
    return {
      state: { ...state, minions: [...state.minions, minion] },
      events: [],
    };
  }
  if (def.type === "ATTACHMENT") {
    const factory = ATTACHMENT_FACTORIES[cardId];
    if (!factory) return { state, events: [] };
    const attachment = factory(`${cardId}-${state.villain.attachments.length}`);
    return {
      state: {
        ...state,
        villain: {
          ...state.villain,
          attachments: [...state.villain.attachments, attachment],
        },
      },
      events: [],
    };
  }
  if (def.type === "SIDE_SCHEME") {
    // Amenaza inicial ×nº de jugadores si la carta lleva el icono [per_hero].
    const startingThreat =
      (def.startingThreat ?? 0) *
      (def.startingThreatPerPlayer === true ? state.players.length : 1);
    const scheme = {
      id: uniqueId(
        `${cardId}-side`,
        state.schemes.map((s) => s.id),
      ),
      cardId,
      name: def.nameEs,
      threat: startingThreat,
      threatToComplete: 0,
      escalationThreat: 0,
      isMain: false,
      accelerationTokens: 0,
    };
    return {
      state: { ...state, schemes: [...state.schemes, scheme] },
      events: [
        { type: "SIDE_SCHEME_ENTERED", schemeId: scheme.id, name: scheme.name },
      ],
    };
  }
  return { state, events: [] };
}

/**
 * Pone en juego, enfrentado a un jugador, un esbirro sacado del mazo de
 * encuentros (o, si no queda copia ahí, de su descarte). Es la acción de la
 * app para los efectos de carta guiados que dicen "pon en juego el esbirro
 * enfrentado a ti" (aumentos con estrella, Ambición cruel, Horda imparable…)
 * y la que usa la preparación (Esclavos duende de La fórmula mutagénica).
 *
 * Carta inexistente, que no sea esbirro o sin copias disponibles → estado
 * intacto.
 */
export function putEncounterMinionIntoPlay(
  state: GameState,
  cardId: string,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  if (getCardDefinition(cardId)?.type !== "MINION") {
    return { state, events: [] };
  }
  let from: GameState;
  const deckIdx = state.encounterDeck.indexOf(cardId);
  if (deckIdx >= 0) {
    const encounterDeck = [...state.encounterDeck];
    encounterDeck.splice(deckIdx, 1);
    from = { ...state, encounterDeck };
  } else {
    const discardIdx = state.encounterDiscard.indexOf(cardId);
    if (discardIdx < 0) {
      return { state, events: [] };
    }
    const encounterDiscard = [...state.encounterDiscard];
    encounterDiscard.splice(discardIdx, 1);
    from = { ...state, encounterDiscard };
  }
  const { state: next, events } = putCardIntoPlay(from, cardId, playerId);
  const minion = next.minions[next.minions.length - 1];
  if (minion === undefined) {
    return { state, events: [] };
  }
  return {
    state: next,
    events: [
      ...events,
      {
        type: "MINION_ENTERED_PLAY",
        minionId: minion.id,
        cardId,
        name: minion.name,
        playerId,
      },
    ],
  };
}

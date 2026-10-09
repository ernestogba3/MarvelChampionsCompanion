import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/**
 * Saca la carta superior del mazo de encuentro. Si está vacío y hay cartas
 * en el descarte, baraja el descarte para formar un mazo nuevo y añade un
 * token de aceleración permanente al plan principal (penalización oficial
 * del Rules Reference por agotar el mazo). Si no queda ninguna carta en
 * ningún sitio, devuelve cardId: null.
 *
 * Compartida por dealPendingEncounterCards (reparto a jugadores) y
 * resolveVillainActivation (carta de impulso del villano).
 */
export function drawFromEncounterDeck(state: GameState): {
  state: GameState;
  cardId: string | null;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  let deck = [...state.encounterDeck];
  let discard = [...state.encounterDiscard];
  let schemes = state.schemes;

  if (deck.length === 0 && discard.length > 0) {
    deck = shuffle(discard);
    discard = [];

    const mainScheme = schemes.find((s) => s.isMain);
    if (mainScheme) {
      schemes = schemes.map((s) =>
        s.id === mainScheme.id
          ? { ...s, accelerationTokens: s.accelerationTokens + 1 }
          : s,
      );
      events.push({
        type: "ENCOUNTER_DECK_RESHUFFLED",
        schemeId: mainScheme.id,
      });
    }
  }

  const cardId = deck.shift() ?? null;

  return {
    state: {
      ...state,
      encounterDeck: deck,
      encounterDiscard: discard,
      schemes,
    },
    cardId,
    events,
  };
}

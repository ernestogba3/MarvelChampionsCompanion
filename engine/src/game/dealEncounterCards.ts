import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function dealPendingEncounterCards(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  let deck = [...state.encounterDeck];
  let discard = [...state.encounterDiscard];
  let players = [...state.players];
  let schemes = state.schemes;

  for (const playerId of state.pendingEncounterDeals) {
    if (deck.length === 0 && discard.length > 0) {
      deck = shuffle(discard);
      discard = [];

      // Penalización oficial (Rules Reference): al agotarse el mazo de
      // encuentros, se baraja el descarte y el plan principal gana un
      // token de aceleración permanente.
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
    const card = deck.shift();
    if (!card) continue;
    players = players.map((p) =>
      p.id === playerId
        ? { ...p, faceDownEncounterCards: [...p.faceDownEncounterCards, card] }
        : p,
    );
    events.push({ type: "ENCOUNTER_CARD_DEALT", playerId });
  }
  return {
    state: {
      ...state,
      players,
      schemes,
      encounterDeck: deck,
      encounterDiscard: discard,
      pendingEncounterDeals: [],
    },
    events,
  };
}

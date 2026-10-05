import type { GameState } from '../domain/types.js';
import type { GameEvent } from '../events/types.js';

export function dealPendingEncounterCards(
  state: GameState,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const deck = [...state.encounterDeck];
  let players = [...state.players];

  for (const playerId of state.pendingEncounterDeals) {
    const card = deck.shift();

    if (!card) continue; // TODO: mazo agotado — pendiente en rules-spec.md

    players = players.map((p) =>
      p.id === playerId
        ? { ...p, faceDownEncounterCards: [...p.faceDownEncounterCards, card] }
        : p,
    );

    events.push({ type: 'ENCOUNTER_CARD_DEALT', playerId });
  }

  return {
    state: {
      ...state,
      players,
      encounterDeck: deck,
      pendingEncounterDeals: [],
    },
    events,
  };
}

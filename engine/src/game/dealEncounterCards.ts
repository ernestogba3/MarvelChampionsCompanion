import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { drawFromEncounterDeck } from "./encounterDeck";
export function dealPendingEncounterCards(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  let currentState = state;
  for (const playerId of state.pendingEncounterDeals) {
    const {
      state: afterDraw,
      cardId,
      events: drawEvents,
    } = drawFromEncounterDeck(currentState);
    currentState = afterDraw;
    events.push(...drawEvents);
    if (!cardId) continue;
    currentState = {
      ...currentState,
      players: currentState.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              faceDownEncounterCards: [...p.faceDownEncounterCards, cardId],
            }
          : p,
      ),
    };
    events.push({ type: "ENCOUNTER_CARD_DEALT", playerId });
  }
  return { state: { ...currentState, pendingEncounterDeals: [] }, events };
}

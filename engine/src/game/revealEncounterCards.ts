import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { resolveRevealedCard } from "./encounterResolution";
export function revealPendingCardsForPlayer(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[]; unresolvedCardIds: string[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Jugador no encontrado: ${playerId}`);
  }
  let currentState = state;
  const allEvents: GameEvent[] = [];
  const unresolvedCardIds: string[] = [];
  for (const cardId of player.faceDownEncounterCards) {
    try {
      const result = resolveRevealedCard(currentState, cardId, playerId);
      currentState = result.state;
      allEvents.push(...result.events);
    } catch {
      unresolvedCardIds.push(cardId);
    }
    currentState = {
      ...currentState,
      encounterDiscard: [...currentState.encounterDiscard, cardId],
    };
  }
  currentState = {
    ...currentState,
    players: currentState.players.map((p) =>
      p.id === playerId ? { ...p, faceDownEncounterCards: [] } : p,
    ),
  };
  return { state: currentState, events: allEvents, unresolvedCardIds };
}

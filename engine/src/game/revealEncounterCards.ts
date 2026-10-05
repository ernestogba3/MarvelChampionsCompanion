import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { getCardDefinition } from "../data/cards";
import { resolveRevealedCard } from "./encounterResolution";
import { putCardIntoPlay } from "./putCardIntoPlay";
const REVEAL_EFFECT_IDS = new Set([
  "01103",
  "01104",
  "01105",
  "01106",
  "01186",
  "01187",
  "01188",
  "01189",
  "01190",
]);
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
    const def = getCardDefinition(cardId);
    if (
      def &&
      (def.type === "MINION" ||
        def.type === "ATTACHMENT" ||
        def.type === "SIDE_SCHEME")
    ) {
      const result = putCardIntoPlay(currentState, cardId, playerId);
      currentState = result.state;
      allEvents.push(...result.events);
    }
    if (REVEAL_EFFECT_IDS.has(cardId)) {
      const result = resolveRevealedCard(currentState, cardId, playerId);
      currentState = result.state;
      allEvents.push(...result.events);
    } else if (!def) {
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

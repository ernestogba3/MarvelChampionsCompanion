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
  overrideCardIds?: string[],
): { state: GameState; events: GameEvent[]; unresolvedCardIds: string[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Jugador no encontrado: ${playerId}`);
  }

  let currentState = state;

  // Si el jugador elige manualmente qué cartas ha robado, intercambiamos
  // las que había puesto el reparto por las que él indica. Para cada swap,
  // la carta original vuelve al mazo y la elegida sale del mazo.
  if (overrideCardIds) {
    if (overrideCardIds.length !== player.faceDownEncounterCards.length) {
      throw new Error(
        `Se esperaban ${player.faceDownEncounterCards.length} cartas elegidas, se recibieron ${overrideCardIds.length}`,
      );
    }

    const originalFaceDown = player.faceDownEncounterCards;
    let newDeck = [...currentState.encounterDeck];
    const newFaceDown: string[] = [];

    for (let i = 0; i < overrideCardIds.length; i++) {
      const original = originalFaceDown[i];
      const picked = overrideCardIds[i];
      if (original === undefined || picked === undefined) {
        throw new Error(`Índice fuera de rango en la posición ${i}`);
      }

      if (picked === original) {
        newFaceDown.push(original);
        continue;
      }

      const pickedIdx = newDeck.indexOf(picked);
      if (pickedIdx < 0) {
        throw new Error(
          `La carta elegida ${picked} no está en el mazo de encuentros`,
        );
      }
      newDeck.splice(pickedIdx, 1);
      newDeck.push(original);
      newFaceDown.push(picked);
    }

    currentState = {
      ...currentState,
      encounterDeck: newDeck,
      players: currentState.players.map((p) =>
        p.id === playerId ? { ...p, faceDownEncounterCards: newFaceDown } : p,
      ),
    };
  }

  const updatedPlayer = currentState.players.find((p) => p.id === playerId)!;
  const allEvents: GameEvent[] = [];
  const unresolvedCardIds: string[] = [];

  for (const cardId of updatedPlayer.faceDownEncounterCards) {
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

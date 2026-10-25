import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { getCardDefinition } from "../data/cards";
import {
  hasRevealResolver,
  resolveRevealedCard,
} from "./encounterResolution";
import { putCardIntoPlay } from "./putCardIntoPlay";
import {
  discardEncounterCard,
  resolveSignatureSchemeOverflows,
} from "./multiVillain";

// Las cartas con "Cuando se muestre" que el motor resuelve son las que tienen
// resolución registrada en encounterResolution (una sola lista).

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
    if (hasRevealResolver(cardId)) {
      const result = resolveRevealedCard(currentState, cardId, playerId);
      currentState = result.state;
      allEvents.push(...result.events);
    } else if (!def) {
      unresolvedCardIds.push(cardId);
    }
    // Oleada impresa (Surge): al revelarse, se revelará una carta de encuentro
    // adicional. El motor emite el evento; la app lo detecta y reparte+revela
    // una carta más al mismo jugador (reutilizando el flujo de reparto/revelado
    // y la selección manual). Las cartas que "ganan Oleada" por condición NO
    // tienen surge:true, así que esa decisión la toma el jugador por el texto.
    if (def?.surge) {
      allEvents.push({ type: "CARD_GAINED_SURGE", cardName: def.nameEs });
    }
    // Planes propios (The Wrecking Crew) que hayan llegado a su umbral por
    // la amenaza que haya colocado esta carta.
    const overflow = resolveSignatureSchemeOverflows(currentState);
    currentState = overflow.state;
    allEvents.push(...overflow.events);
    // Al descarte del mazo de su villano (en escenarios de un solo villano,
    // el descarte de siempre).
    currentState = discardEncounterCard(currentState, cardId);
  }

  currentState = {
    ...currentState,
    players: currentState.players.map((p) =>
      p.id === playerId ? { ...p, faceDownEncounterCards: [] } : p,
    ),
  };

  return { state: currentState, events: allEvents, unresolvedCardIds };
}

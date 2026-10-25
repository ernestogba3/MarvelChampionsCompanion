import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
import { getCardDefinition } from "../data/cards";
import { placeOrElseRemoveEnvironmentCounters } from "./villainFaces";

// "Cuando se muestre esta carta" del pack The Green Goblin que el motor
// resuelve solo. El resto de cartas del pack se resuelven por su texto.

/** Último plan secundario en juego con ese cardId (el que acaba de entrar). */
function lastSchemeWithCard(state: GameState, cardId: string) {
  for (let i = state.schemes.length - 1; i >= 0; i--) {
    const s = state.schemes[i];
    if (s !== undefined && s.cardId === cardId) return s;
  }
  return undefined;
}

/**
 * Industrias Oscorp (02010): "Cuando se muestre esta carta (Norman Osborn):
 * coloca 1 ×jugadores de Amenaza adicional sobre esta carta". Solo si el
 * villano está por su cara Norman Osborn (A).
 */
export function resolveOscorpManufacturing(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const scheme = lastSchemeWithCard(state, "02010");
  if (scheme === undefined || state.villain.face !== "A") {
    return { state, events: [] };
  }
  return applyEffects(state, [
    {
      type: "ADD_THREAT",
      target: { kind: "SCHEME", schemeId: scheme.id },
      amount: state.players.length,
    },
  ]);
}

/**
 * Rutina laboral (02012): "coloca 2 contadores de Infamia sobre Empresa
 * criminal. Si no puedes hacerlo, quita 2 contadores de Locura de Estado de
 * locura".
 */
export function resolveAllInADaysWork(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  return placeOrElseRemoveEnvironmentCounters(state, 2);
}

/**
 * Duendes de refuerzo (02026): "coloca 1 de Amenaza adicional sobre esta
 * carta por cada Esbirro [[Duende]] que haya en juego".
 */
export function resolveGoblinReinforcements(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const scheme = lastSchemeWithCard(state, "02026");
  if (scheme === undefined) {
    return { state, events: [] };
  }
  const goblins = state.minions.filter(
    (m) => getCardDefinition(m.cardId)?.traits?.includes("Goblin") ?? false,
  ).length;
  if (goblins === 0) {
    return { state, events: [] };
  }
  return applyEffects(state, [
    {
      type: "ADD_THREAT",
      target: { kind: "SCHEME", schemeId: scheme.id },
      amount: goblins,
    },
  ]);
}

import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
import { getCardDefinition } from "../data/cards";
export function resolveBreakinTakinReveal(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const scheme = state.schemes.find((s) => s.name === "Arramblar con todo");
  if (!scheme) return { state, events: [] };
  return applyEffects(state, [
    {
      type: "ADD_THREAT",
      target: { kind: "SCHEME", schemeId: scheme.id },
      amount: 1,
    },
  ]);
}
/**
 * Icono de Crisis: mientras haya en juego un plan secundario con Crisis, no se
 * puede quitar amenaza del plan principal. Se lee del catálogo (crisis); el
 * nombre "Control de multitudes" se mantiene para partidas guardadas antiguas
 * cuyos planes no traían cardId.
 */
export function canRemoveThreatFromMainScheme(state: GameState): boolean {
  return !state.schemes.some(
    (s) =>
      !s.isMain &&
      (getCardDefinition(s.cardId)?.crisis === true ||
        s.name === "Control de multitudes"),
  );
}
export function dealsExtraEncounterCard(state: GameState): boolean {
  return hazardIconsInPlay(state) > 0;
}
/**
 * Iconos de Peligro de los planes en juego (principal y secundarios): cada uno
 * reparte 1 carta de encuentro adicional en el paso 3 de la fase del villano.
 */
export function hazardIconsInPlay(state: GameState): number {
  return state.schemes.reduce(
    (sum, s) => sum + (getCardDefinition(s.cardId)?.hazardIcons ?? 0),
    0,
  );
}
/**
 * Encola las cartas de Peligro: una por icono, repartidas en orden de
 * jugadores empezando por el jugador inicial (RRG, "Hazard"). Se llama una
 * vez al entrar en el paso de repartir cartas de encuentro.
 */
export function queueHazardEncounterCards(state: GameState): GameState {
  const hazards = hazardIconsInPlay(state);
  if (hazards === 0 || state.players.length === 0) {
    return state;
  }
  const firstIdx = Math.max(
    0,
    state.players.findIndex((p) => p.id === state.firstPlayerId),
  );
  const extra: string[] = [];
  for (let i = 0; i < hazards; i++) {
    const p = state.players[(firstIdx + i) % state.players.length];
    if (p !== undefined) extra.push(p.id);
  }
  return {
    ...state,
    pendingEncounterDeals: [...state.pendingEncounterDeals, ...extra],
  };
}

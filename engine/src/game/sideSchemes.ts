import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
export function resolveBreakinTakinReveal(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  const scheme = state.schemes.find((s) => s.name === "Arramblar con todo");
  if (!scheme) return { state, events };
  events.push({ type: "THREAT_ADDED", schemeId: scheme.id, amount: 1 });
  const newSchemes = state.schemes.map((s) =>
    s.id === scheme.id ? { ...s, threat: s.threat + 1 } : s,
  );
  return { state: { ...state, schemes: newSchemes }, events };
}
export function canRemoveThreatFromMainScheme(state: GameState): boolean {
  return !state.schemes.some((s) => s.name === "Control de multitudes");
}
export function dealsExtraEncounterCard(state: GameState): boolean {
  return state.schemes.some((s) => s.name === "Arramblar con todo");
}

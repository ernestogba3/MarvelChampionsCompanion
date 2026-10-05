import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
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
export function canRemoveThreatFromMainScheme(state: GameState): boolean {
  return !state.schemes.some((s) => s.name === "Control de multitudes");
}
export function dealsExtraEncounterCard(state: GameState): boolean {
  return state.schemes.some((s) => s.name === "Arramblar con todo");
}

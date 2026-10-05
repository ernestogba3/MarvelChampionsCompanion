import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
export function addThreatStep(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const mainScheme = state.schemes.find((s) => s.isMain)!;
  const amount = mainScheme.escalationThreat * state.players.length;
  return applyEffects(state, [
    { type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount },
  ]);
}

import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffect } from "../effects/applyEffect";
export function resolveShockerReveal(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  let currentState = state;
  const events: GameEvent[] = [];
  for (const p of state.players) {
    const result = applyEffect(currentState, {
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId: p.id },
      amount: 1,
      source: "Conmocionador",
    });
    currentState = result.state;
    events.push(...result.events);
  }
  return { state: currentState, events };
}

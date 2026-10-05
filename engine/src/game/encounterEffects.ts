import type { GameState } from "../domain/types.ts";
import type { GameEvent } from "../events/types.ts";
export function resolveShockerReveal(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  const newPlayers = state.players.map((p) => {
    events.push({
      type: "DAMAGE_DEALT",
      targetId: p.id,
      amount: 1,
      source: "Conmocionador",
    });
    return { ...p, health: Math.max(0, p.health - 1) };
  });
  return { state: { ...state, players: newPlayers }, events };
}

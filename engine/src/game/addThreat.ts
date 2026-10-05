import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
export function addThreatStep(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  const playerCount = state.players.length;
  const newSchemes = state.schemes.map((s) => {
    if (!s.isMain) return s;
    const amount = s.escalationThreat * playerCount;
    events.push({ type: "THREAT_ADDED", schemeId: s.id, amount });
    return { ...s, threat: s.threat + amount };
  });
  return { state: { ...state, schemes: newSchemes }, events };
}

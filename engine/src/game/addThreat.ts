import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";

export function addThreatStep(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const mainScheme = state.schemes.find((s) => s.isMain)!;
  // La aceleración impresa escala por número de jugadores; los tokens de
  // aceleración (por mazo de encuentros agotado) son un bonus fijo, no se
  // multiplican por jugadores.
  const amount =
    mainScheme.escalationThreat * state.players.length +
    mainScheme.accelerationTokens;
  return applyEffects(state, [
    { type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount },
  ]);
}

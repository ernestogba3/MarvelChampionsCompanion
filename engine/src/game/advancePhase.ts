import type { GameState } from "../domain/types";
import { nextPhase } from "./phases";
export function advanceToNextStep(state: GameState): GameState {
  const newPhase = nextPhase(state.phase);
  const startingNewRound =
    state.phase.name === "VILLAIN_PHASE" &&
    state.phase.step === "PASS_FIRST_PLAYER";
  return {
    ...state,
    phase: newPhase,
    round: startingNewRound ? state.round + 1 : state.round,
  };
}

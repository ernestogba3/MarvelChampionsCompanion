import type { GamePhase, VillainPhaseStep } from "../domain/types.ts";
const VILLAIN_STEPS: VillainPhaseStep[] = [
  "ADD_THREAT",
  "VILLAIN_ACTIVATION",
  "DEAL_ENCOUNTER_CARDS",
  "REVEAL_ENCOUNTER_CARDS",
  "PASS_FIRST_PLAYER",
];
export function nextPhase(current: GamePhase): GamePhase {
  if (current.name === "PLAYER_PHASE") {
    return { name: "VILLAIN_PHASE", step: VILLAIN_STEPS[0] };
  }
  const currentIndex = VILLAIN_STEPS.indexOf(current.step);
  if (currentIndex < VILLAIN_STEPS.length - 1) {
    return { name: "VILLAIN_PHASE", step: VILLAIN_STEPS[currentIndex + 1] };
  }
  return { name: "PLAYER_PHASE" };
}

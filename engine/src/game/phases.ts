import type { GamePhase, VillainPhaseStep } from "../domain/types";

const VILLAIN_STEPS: VillainPhaseStep[] = [
  "ADD_THREAT",
  "VILLAIN_ACTIVATION",
  "DEAL_ENCOUNTER_CARDS",
  "REVEAL_ENCOUNTER_CARDS",
  "PASS_FIRST_PLAYER",
];

export function nextPhase(current: GamePhase): GamePhase {
  if (current.name === "PLAYER_PHASE") {
    // Primer paso de la fase de villano (igual que VILLAIN_STEPS[0]).
    return { name: "VILLAIN_PHASE", step: "ADD_THREAT" };
  }

  const currentIndex = VILLAIN_STEPS.indexOf(current.step);
  const next = VILLAIN_STEPS[currentIndex + 1];
  if (next !== undefined) {
    return { name: "VILLAIN_PHASE", step: next };
  }
  return { name: "PLAYER_PHASE" };
}

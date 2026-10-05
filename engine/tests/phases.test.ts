import { describe, it, expect } from "vitest";
import { nextPhase } from "../src/game/phases";
import type { GamePhase } from "../src/domain/types";
describe("Secuencia de ronda", () => {
  it("TC-001: la ronda solo tiene dos fases", () => {
    const phase2 = nextPhase({ name: "PLAYER_PHASE" });
    expect(phase2.name).toBe("VILLAIN_PHASE");
  });
  it("TC-002: el orden de los 5 pasos de la fase del villano es correcto", () => {
    let phase: GamePhase = { name: "VILLAIN_PHASE", step: "ADD_THREAT" };
    const stepsSeen: string[] = [];
    for (let i = 0; i < 5; i++) {
      if (phase.name === "VILLAIN_PHASE") stepsSeen.push(phase.step);
      phase = nextPhase(phase);
    }
    expect(stepsSeen).toEqual([
      "ADD_THREAT",
      "VILLAIN_ACTIVATION",
      "DEAL_ENCOUNTER_CARDS",
      "REVEAL_ENCOUNTER_CARDS",
      "PASS_FIRST_PLAYER",
    ]);
  });
});

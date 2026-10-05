import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { advanceToNextStep } from "../src/game/advancePhase";
describe("advanceToNextStep", () => {
  it("avanza de fase de jugador a Paso 1 sin cambiar la ronda", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const after = advanceToNextStep(state);
    expect(after.phase).toEqual({ name: "VILLAIN_PHASE", step: "ADD_THREAT" });
    expect(after.round).toBe(1);
  });
  it("incrementa la ronda al terminar el Paso 5", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      phase: {
        name: "VILLAIN_PHASE" as const,
        step: "PASS_FIRST_PLAYER" as const,
      },
    };
    const after = advanceToNextStep(state);
    expect(after.phase).toEqual({ name: "PLAYER_PHASE" });
    expect(after.round).toBe(2);
  });
});

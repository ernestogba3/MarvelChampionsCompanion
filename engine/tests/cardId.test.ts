import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import {
  advanceToRhinoStageTwo,
  advanceToRhinoStageThree,
} from "../src/game/villainStages";

describe("cardId en villano y planes", () => {
  it("Standard: Rino I tiene cardId 01094 y el plan principal 01097", () => {
    const state = createSpiderManVsRhinoGame("player-1", "STANDARD");
    expect(state.villain.cardId).toBe("01094");
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main.cardId).toBe("01097");
  });

  it("Expert: Rino II tiene cardId 01095 y Arramblar con todo 01107", () => {
    const state = createSpiderManVsRhinoGame("player-1", "EXPERT");
    expect(state.villain.cardId).toBe("01095");
    const side = state.schemes.find((s) => !s.isMain)!;
    expect(side.cardId).toBe("01107");
  });

  it("advanceToRhinoStageTwo actualiza cardId del villano a 01095", () => {
    const base = createSpiderManVsRhinoGame("player-1", "STANDARD");
    const { state: after } = advanceToRhinoStageTwo(base);
    expect(after.villain.cardId).toBe("01095");
  });

  it("advanceToRhinoStageThree actualiza cardId del villano a 01096", () => {
    const base = createSpiderManVsRhinoGame("player-1", "EXPERT");
    const { state: after } = advanceToRhinoStageThree(base);
    expect(after.villain.cardId).toBe("01096");
  });
});

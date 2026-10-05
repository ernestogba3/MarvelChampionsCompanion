import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { advanceToRhinoStageTwo } from "../src/game/villainStages";
describe("TC-011 y TC-012: transición a Rino (II)", () => {
  it("TC-011: cambia a los valores de Rino (II)", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after, events } = advanceToRhinoStageTwo(state);
    expect(after.villain.stage).toBe("II");
    expect(after.villain.attack).toBe(3);
    expect(after.villain.health).toBe(15);
    expect(events).toContainEqual({
      type: "VILLAIN_STAGE_CHANGED",
      from: "I",
      to: "II",
    });
  });
  it('TC-012: añade "Arramblar con todo" en juego', () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = advanceToRhinoStageTwo(state);
    const sideScheme = after.schemes.find(
      (s) => s.name === "Arramblar con todo",
    );
    expect(sideScheme).toBeDefined();
    expect(sideScheme?.threat).toBe(2);
  });
});

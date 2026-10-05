import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { addThreatStep } from "../src/game/addThreat";
describe("TC-013: escalada de amenaza en el Paso 1", () => {
  it("añade 1 de amenaza por jugador al plan principal", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after, events } = addThreatStep(state);
    expect(after.schemes[0].threat).toBe(1);
    expect(events).toContainEqual({
      type: "THREAT_ADDED",
      schemeId: "main-break-in",
      amount: 1,
    });
  });
});

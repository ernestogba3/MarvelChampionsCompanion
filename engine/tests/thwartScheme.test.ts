import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { thwartScheme } from "../src/game/playerActions";
describe("thwartScheme", () => {
  it("quita amenaza del plan principal", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, schemes: [{ ...base.schemes[0], threat: 5 }] };
    const { state: after, events } = thwartScheme(state, "main-break-in", 2);
    expect(after.schemes[0].threat).toBe(3);
    expect(events).toContainEqual({
      type: "THREAT_REMOVED",
      schemeId: "main-break-in",
      amount: 2,
    });
  });
  it("bloquea quitar amenaza del plan principal si Control de multitudes está en juego", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      schemes: [
        { ...base.schemes[0], threat: 5 },
        {
          id: "side-2",
          name: "Control de multitudes",
          threat: 2,
          threatToComplete: 0,
          escalationThreat: 0,
          isMain: false,
        },
      ],
    };
    const { state: after } = thwartScheme(state, "main-break-in", 2);
    expect(after.schemes.find((s) => s.id === "main-break-in")?.threat).toBe(5);
  });
  it("descarta un side scheme cuando su amenaza llega a 0", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      schemes: [
        ...base.schemes,
        {
          id: "side-1",
          name: "Arramblar con todo",
          threat: 2,
          threatToComplete: 0,
          escalationThreat: 0,
          isMain: false,
        },
      ],
    };
    const { state: after } = thwartScheme(state, "side-1", 2);
    expect(after.schemes.find((s) => s.id === "side-1")).toBeUndefined();
  });
});

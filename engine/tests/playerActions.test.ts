import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { attackVillain, checkGameOutcome } from "../src/game/playerActions";
describe("attackVillain", () => {
  it("inflige daño normal si Rino queda con vida", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = attackVillain(state, 5);
    expect(after.villain.health).toBe(9);
    expect(after.villain.stage).toBe("I");
  });
  it("pasa a Rino (II) si la etapa I queda a 0 o menos", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = attackVillain(state, 20);
    expect(after.villain.stage).toBe("II");
    expect(after.villain.health).toBe(15);
  });
});
describe("checkGameOutcome", () => {
  it("ONGOING por defecto", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    expect(checkGameOutcome(state)).toBe("ONGOING");
  });
  it("LOSS si la amenaza del plan principal llega a su umbral", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, schemes: [{ ...base.schemes[0], threat: 7 }] };
    expect(checkGameOutcome(state)).toBe("LOSS");
  });
  it("WIN si Rino (II) queda a 0 de vida", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      villain: { ...base.villain, stage: "II" as const, health: 0 },
    };
    expect(checkGameOutcome(state)).toBe("WIN");
  });
});

import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame.ts";
import { resolveShockerReveal } from "../src/game/encounterEffects.ts";
describe("TC-016: Conmocionador daña a todos al revelarse", () => {
  it("inflige 1 de daño a cada héroe", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after, events } = resolveShockerReveal(state);
    expect(after.players[0].health).toBe(9);
    expect(events).toContainEqual({
      type: "DAMAGE_DEALT",
      targetId: "player-1",
      amount: 1,
      source: "Conmocionador",
    });
  });
});

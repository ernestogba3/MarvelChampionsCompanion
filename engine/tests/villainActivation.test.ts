import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame.js";
import { resolveVillainActivation } from "../src/game/villainActivation.js";
describe("TC-003: activación del villano según identidad", () => {
  it("ataca al jugador si está en forma de héroe", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], form: "HERO" as const }],
    };
    const { state: after, events } = resolveVillainActivation(
      state,
      "player-1",
    );
    expect(after.players[0].health).toBe(8);
    expect(after.pendingEncounterDeals).toContain("player-1");
    expect(events).toContainEqual({
      type: "VILLAIN_ATTACKED",
      playerId: "player-1",
      amount: 2,
    });
  });
  it("avanza el plan si el jugador está en alter ego", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after, events } = resolveVillainActivation(
      state,
      "player-1",
    );
    expect(after.players[0].health).toBe(10);
    expect(after.schemes[0].threat).toBe(1);
    expect(after.pendingEncounterDeals).toHaveLength(0);
    expect(events).toContainEqual({
      type: "VILLAIN_SCHEMED",
      schemeId: "main-break-in",
      amount: 1,
    });
  });
});

import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
describe("Creación de partida inicial", () => {
  it("crea una partida de Spider-Man vs Rhino (I) con los valores base correctos", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    expect(state.round).toBe(1);
    expect(state.phase).toEqual({ name: "PLAYER_PHASE" });
    expect(state.villain.name).toBe("Rhino");
    expect(state.villain.stage).toBe("I");
    expect(state.villain.health).toBe(14);
    expect(state.schemes[0].threatToComplete).toBe(7);
    expect(state.players[0].form).toBe("ALTER_EGO");
  });
});

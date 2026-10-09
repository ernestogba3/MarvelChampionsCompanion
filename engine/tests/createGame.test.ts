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
    expect(state.schemes[0]!.threatToComplete).toBe(7);
    expect(state.players[0]!.form).toBe("ALTER_EGO");
  });

  it("arranca con las 24 cartas reales del mazo de encuentro", () => {
    const state = createSpiderManVsRhinoGame("player-1");

    expect(state.encounterDeck).toHaveLength(24);
    expect(
      state.encounterDeck.filter((id: string) => id === "01106"),
    ).toHaveLength(3); // Estampida x3
    expect(
      state.encounterDeck.filter((id: string) => id === "01105"),
    ).toHaveLength(2); // "¡Soy duro!" x2
  });
});

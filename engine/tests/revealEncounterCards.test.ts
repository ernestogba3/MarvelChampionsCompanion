import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { revealPendingCardsForPlayer } from "../src/game/revealEncounterCards";

describe("revealPendingCardsForPlayer", () => {
  it("resuelve un tratado registrado y lo mueve al descarte", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], faceDownEncounterCards: ["01105"] }],
    };
    const { state: after } = revealPendingCardsForPlayer(state, "player-1");
    expect(after.villain.tough).toBe(true);
    expect(after.encounterDiscard).toEqual(["01105"]);
  });

  it("pone en juego un esbirro al revelarse (Mercenario de Hydra)", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], faceDownEncounterCards: ["01101"] }],
    };
    const { state: after } = revealPendingCardsForPlayer(state, "player-1");
    expect(after.minions).toHaveLength(1);
    expect(after.minions[0].name).toBe("Mercenario de Hydra");
    expect(after.minions[0].guard).toBe(true);
    expect(after.minions[0].engagedWith).toBe("player-1");
  });

  it("acopla un accesorio al villano al revelarse (Piel blindada del Rino)", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], faceDownEncounterCards: ["01098"] }],
    };
    const { state: after } = revealPendingCardsForPlayer(state, "player-1");
    expect(after.villain.attachments).toHaveLength(1);
    expect(after.villain.attachments[0].redirectsDamage).toBe(true);
  });

  it("pone en juego un side scheme al revelarse (Control de multitudes)", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], faceDownEncounterCards: ["01108"] }],
    };
    const { state: after, events } = revealPendingCardsForPlayer(
      state,
      "player-1",
    );
    expect(after.schemes.some((s) => s.name === "Control de multitudes")).toBe(
      true,
    );
    expect(events).toContainEqual(
      expect.objectContaining({ type: "SIDE_SCHEME_ENTERED" }),
    );
  });

  it("el Conmocionador entra en juego Y causa daño a la vez", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], faceDownEncounterCards: ["01103"] }],
    };
    const { state: after } = revealPendingCardsForPlayer(state, "player-1");
    expect(after.minions.some((m) => m.name === "Conmocionador")).toBe(true);
    expect(after.players[0].health).toBe(9);
  });

  it("intercambia la carta boca abajo por la elegida manualmente", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      encounterDeck: ["01105"],
      players: [{ ...base.players[0], faceDownEncounterCards: ["01101"] }],
    };
    const { state: after } = revealPendingCardsForPlayer(state, "player-1", [
      "01105",
    ]);
    expect(after.villain.tough).toBe(true);
    expect(after.minions).toHaveLength(0);
    expect(after.encounterDiscard).toEqual(["01105"]);
    expect(after.encounterDeck).toContain("01101");
  });

  it("falla si la carta elegida no está en el mazo", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      encounterDeck: ["01105"],
      players: [{ ...base.players[0], faceDownEncounterCards: ["01101"] }],
    };
    expect(() =>
      revealPendingCardsForPlayer(state, "player-1", ["01190"]),
    ).toThrow();
  });
});

import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { revealPendingCardsForPlayer } from "../src/game/revealEncounterCards";
describe("revealPendingCardsForPlayer", () => {
  it("resuelve una carta registrada y la mueve al descarte", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], faceDownEncounterCards: ["01105"] }],
    };
    const { state: after, events } = revealPendingCardsForPlayer(
      state,
      "player-1",
    );
    expect(after.villain.tough).toBe(true);
    expect(after.players[0].faceDownEncounterCards).toEqual([]);
    expect(after.encounterDiscard).toEqual(["01105"]);
    expect(events.length).toBeGreaterThan(0);
  });
  it("no revienta con una carta todavía no registrada, y la descarta igualmente", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], faceDownEncounterCards: ["01098"] }],
    };
    const { state: after, unresolvedCardIds } = revealPendingCardsForPlayer(
      state,
      "player-1",
    );
    expect(after.encounterDiscard).toEqual(["01098"]);
    expect(unresolvedCardIds).toEqual(["01098"]);
  });
});

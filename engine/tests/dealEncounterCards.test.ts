import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { dealPendingEncounterCards } from "../src/game/dealEncounterCards";
describe("TC-004: reparto de cartas de encuentro", () => {
  it("reparte una carta boca abajo por cada ataque recibido", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      encounterDeck: ["card-a", "card-b", "card-c"],
      pendingEncounterDeals: ["player-1", "player-1"],
    };
    const { state: after, events } = dealPendingEncounterCards(state);
    expect(after.players[0].faceDownEncounterCards).toEqual([
      "card-a",
      "card-b",
    ]);
    expect(after.encounterDeck).toEqual(["card-c"]);
    expect(after.pendingEncounterDeals).toHaveLength(0);
    expect(events).toHaveLength(2);
  });
  it("cuando el mazo se agota, baraja el descarte para seguir repartiendo", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      encounterDeck: ["card-a"],
      encounterDiscard: ["card-b", "card-c"],
      pendingEncounterDeals: ["player-1", "player-1"],
    };
    const { state: after } = dealPendingEncounterCards(state);
    expect(after.players[0].faceDownEncounterCards).toHaveLength(2);
    expect(after.encounterDeck).toHaveLength(1);
    expect(after.encounterDiscard).toHaveLength(0);
  });
});

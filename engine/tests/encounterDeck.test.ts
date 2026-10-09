import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { drawFromEncounterDeck } from "../src/game/encounterDeck";
describe("drawFromEncounterDeck", () => {
  it("saca la carta superior del mazo", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, encounterDeck: ["01099", "01100"] };
    const { state: after, cardId } = drawFromEncounterDeck(state);
    expect(cardId).toBe("01099");
    expect(after.encounterDeck).toEqual(["01100"]);
  });
  it("mazo vacío con descarte: baraja y gana un token de aceleración", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      encounterDeck: [],
      encounterDiscard: ["01098", "01099"],
    };
    const { state: after, cardId, events } = drawFromEncounterDeck(state);
    expect(cardId).not.toBeNull();
    expect(after.encounterDiscard).toHaveLength(0);
    expect(after.encounterDeck).toHaveLength(1);
    const mainScheme = after.schemes.find((s) => s.isMain)!;
    expect(mainScheme.accelerationTokens).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "ENCOUNTER_DECK_RESHUFFLED" }),
    );
  });
  it("mazo y descarte vacíos: devuelve cardId null sin lanzar error", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, encounterDeck: [], encounterDiscard: [] };
    const { cardId, events } = drawFromEncounterDeck(state);
    expect(cardId).toBeNull();
    expect(events).toHaveLength(0);
  });
});

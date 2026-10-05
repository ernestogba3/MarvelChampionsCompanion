import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { resolveRevealedCard } from "../src/game/encounterResolution";
describe("Registro de resolución de cartas reveladas (Fase 4)", () => {
  it('resuelve "¡Soy duro!" (01105) a través del registro', () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = resolveRevealedCard(state, "01105", "player-1");
    expect(after.villain.tough).toBe(true);
  });
  it('resuelve "Mover ficha" (01186) a través del registro', () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = resolveRevealedCard(state, "01186", "player-1");
    expect(after.schemes[0].threat).toBe(1);
  });
  it("lanza un error si la carta no tiene resolución registrada", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    expect(() => resolveRevealedCard(state, "01094", "player-1")).toThrow();
  });
});

import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import {
  serializeGameState,
  deserializeGameState,
} from "../src/persistence/serialize";
import { resolveVillainActivation } from "../src/game/villainActivation";
describe("Persistencia offline (Fase 7, parte de motor)", () => {
  it("serializeGameState + deserializeGameState devuelve un estado idéntico", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const restored = deserializeGameState(serializeGameState(state));
    expect(restored).toEqual(state);
  });
  it("conserva los cambios hechos a mitad de partida", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const { state: afterAttack } = resolveVillainActivation(
      { ...base, players: [{ ...base.players[0]!, form: "HERO" }] },
      "player-1",
    );
    const restored = deserializeGameState(serializeGameState(afterAttack));
    expect(restored.players[0]!.health).toBe(afterAttack.players[0]!.health);
    expect(restored.eventLog).toEqual(afterAttack.eventLog);
  });
  it("lanza un error si el JSON está corrupto", () => {
    expect(() => deserializeGameState("{ esto no es JSON válido")).toThrow();
  });
  it("lanza un error si falta el campo version", () => {
    expect(() => deserializeGameState(JSON.stringify({ state: {} }))).toThrow();
  });
});

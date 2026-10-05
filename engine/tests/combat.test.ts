import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame.ts";
import { canAttackVillain } from "../src/game/combat.ts";
describe("TC-010: Guardia impide atacar al villano", () => {
  it("no permite atacar si hay un esbirro con Guardia enfrentado", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      minions: [
        {
          id: "minion-1",
          cardId: "01101",
          name: "Mercenario de Hydra",
          attack: 1,
          scheme: 0,
          health: 3,
          maxHealth: 3,
          engagedWith: "player-1",
          tough: false,
          guard: true,
        },
      ],
    };
    expect(canAttackVillain(state, "player-1")).toBe(false);
  });
  it("permite atacar si no hay esbirros enfrentados", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    expect(canAttackVillain(state, "player-1")).toBe(true);
  });
  it("permite atacar si el esbirro con Guardia está enfrentado con otro jugador", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      minions: [
        {
          id: "minion-1",
          cardId: "01101",
          name: "Mercenario de Hydra",
          attack: 1,
          scheme: 0,
          health: 3,
          maxHealth: 3,
          engagedWith: "player-2",
          tough: false,
          guard: true,
        },
      ],
    };
    expect(canAttackVillain(state, "player-1")).toBe(true);
  });
});

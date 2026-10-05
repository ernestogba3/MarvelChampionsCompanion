import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { attackMinion } from "../src/game/playerActions";
describe("attackMinion", () => {
  it("reduce la vida del esbirro", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      minions: [
        {
          id: "m1",
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
    const { state: after } = attackMinion(state, "m1", 2);
    expect(after.minions[0].health).toBe(1);
  });
  it("elimina al esbirro si su vida llega a 0", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      minions: [
        {
          id: "m1",
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
    const { state: after } = attackMinion(state, "m1", 5);
    expect(after.minions).toHaveLength(0);
  });
  it("un esbirro con dureza previene el daño y pierde el estado", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      minions: [
        {
          id: "m1",
          cardId: "01102",
          name: "Hombre de Arena",
          attack: 3,
          scheme: 2,
          health: 4,
          maxHealth: 4,
          engagedWith: "player-1",
          tough: true,
          guard: false,
        },
      ],
    };
    const { state: after, events } = attackMinion(state, "m1", 10);
    expect(after.minions[0].health).toBe(4);
    expect(after.minions[0].tough).toBe(false);
    expect(events).toContainEqual({
      type: "STATUS_REMOVED",
      targetId: "m1",
      status: "TOUGH",
    });
  });
});

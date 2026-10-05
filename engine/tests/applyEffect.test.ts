import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame.ts";
import { applyEffect, applyEffects } from "../src/effects/applyEffect.ts";
describe("Sistema de Effects (Fase 3)", () => {
  it("DEAL_DAMAGE a un jugador reduce su vida", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after, events } = applyEffect(state, {
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId: "player-1" },
      amount: 3,
      source: "test",
    });
    expect(after.players[0].health).toBe(7);
    expect(events).toContainEqual({
      type: "DAMAGE_DEALT",
      targetId: "player-1",
      amount: 3,
      source: "test",
    });
  });
  it("ADD_THREAT al plan principal", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = applyEffect(state, {
      type: "ADD_THREAT",
      target: { kind: "MAIN_SCHEME" },
      amount: 2,
    });
    expect(after.schemes[0].threat).toBe(2);
  });
  it("applyEffects resuelve varios efectos en orden", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after, events } = applyEffects(state, [
      {
        type: "DEAL_DAMAGE",
        target: { kind: "VILLAIN" },
        amount: 2,
        source: "test",
      },
      { type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount: 1 },
    ]);
    expect(after.villain.health).toBe(12);
    expect(after.schemes[0].threat).toBe(1);
    expect(events).toHaveLength(2);
  });
  it("un villano con dureza previene el daño y pierde el estado", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, villain: { ...base.villain, tough: true } };
    const { state: after, events } = applyEffect(state, {
      type: "DEAL_DAMAGE",
      target: { kind: "VILLAIN" },
      amount: 5,
      source: "test",
    });
    expect(after.villain.health).toBe(14);
    expect(after.villain.tough).toBe(false);
    expect(events).toContainEqual({
      type: "STATUS_REMOVED",
      targetId: "villain",
      status: "TOUGH",
    });
  });
});

import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame.ts";
import {
  resolveImTough,
  resolveHardToKeepDown,
  resolveStampede,
} from "../src/game/villainTreacheries.ts";
describe("Tratados de Rino", () => {
  it('TC-017: "¡Soy duro!" da dureza si Rino no la tiene', () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after, events } = resolveImTough(state);
    expect(after.villain.tough).toBe(true);
    expect(events).not.toContainEqual(
      expect.objectContaining({ type: "CARD_GAINED_SURGE" }),
    );
  });
  it('TC-018: "¡Soy duro!" gana oleada si Rino ya tiene dureza', () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, villain: { ...base.villain, tough: true } };
    const { events } = resolveImTough(state);
    expect(events).toContainEqual({
      type: "CARD_GAINED_SURGE",
      cardName: '"¡Soy duro!"',
    });
  });
  it('TC-019: "Difícil de tumbar" cura 4 si Rino está dañado', () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, villain: { ...base.villain, health: 10 } };
    const { state: after, events } = resolveHardToKeepDown(state);
    expect(after.villain.health).toBe(14);
    expect(events).toContainEqual({
      type: "HEALTH_HEALED",
      targetId: "villain",
      amount: 4,
      source: "Difícil de tumbar",
    });
  });
  it('TC-020: "Difícil de tumbar" gana oleada a vida completa', () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { events } = resolveHardToKeepDown(state);
    expect(events).toContainEqual({
      type: "CARD_GAINED_SURGE",
      cardName: "Difícil de tumbar",
    });
  });
  it('TC-021: "Estampida" gana oleada en alter ego', () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { events } = resolveStampede(state, "player-1");
    expect(events).toContainEqual({
      type: "CARD_GAINED_SURGE",
      cardName: "Estampida",
    });
  });
  it('TC-022: "Estampida" ataca y aturde en forma de héroe', () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], form: "HERO" as const }],
    };
    const { state: after, events } = resolveStampede(state, "player-1");
    expect(after.players[0].health).toBe(8);
    expect(after.players[0].stunned).toBe(true);
    expect(events).toContainEqual({
      type: "STATUS_GAINED",
      targetId: "player-1",
      status: "STUNNED",
    });
  });
});

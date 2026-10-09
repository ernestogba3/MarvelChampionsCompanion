import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { resolveVillainActivation } from "../src/game/villainActivation";
describe("TC-003: activación del villano según identidad", () => {
  it("ataca al jugador si está en forma de héroe", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], form: "HERO" as const }],
    };
    const { state: after, events } = resolveVillainActivation(
      state,
      "player-1",
    );
    expect(after.players[0].health).toBe(8);
    expect(after.pendingEncounterDeals).toContain("player-1");
    expect(events).toContainEqual({
      type: "VILLAIN_ATTACKED",
      playerId: "player-1",
      amount: 2,
    });
  });
  it("avanza el plan si el jugador está en alter ego", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after, events } = resolveVillainActivation(
      state,
      "player-1",
    );
    expect(after.players[0].health).toBe(10);
    expect(after.schemes[0].threat).toBe(1);
    expect(after.pendingEncounterDeals).toHaveLength(0);
    expect(events).toContainEqual({
      type: "VILLAIN_SCHEMED",
      schemeId: "main-break-in",
      amount: 1,
    });
  });
  it("los esbirros enfrentados también atacan en este paso", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], form: "HERO" as const }],
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
    const { state: after } = resolveVillainActivation(state, "player-1");
    expect(after.players[0].health).toBe(7);
    expect(after.pendingEncounterDeals).toEqual(["player-1", "player-1"]);
  });
  it("carta de impulso con icono 2 (Embestida) suma al ataque del villano", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], form: "HERO" as const }],
      encounterDeck: ["01099"],
    };
    const { state: after, events } = resolveVillainActivation(
      state,
      "player-1",
    );
    expect(after.players[0].health).toBe(6);
    expect(events).toContainEqual({
      type: "VILLAIN_ATTACKED",
      playerId: "player-1",
      amount: 4,
    });
    expect(events).toContainEqual({
      type: "BOOST_CARD_REVEALED",
      cardId: "01099",
      boostValue: 2,
    });
    expect(after.encounterDiscard).toContain("01099");
    expect(after.encounterDeck).toHaveLength(0);
  });
  it("carta sin icono de impulso (Mover ficha) no añade nada al plan del villano", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, encounterDeck: ["01186"] };
    const { state: after, events } = resolveVillainActivation(
      state,
      "player-1",
    );
    expect(after.schemes[0].threat).toBe(1);
    expect(events).toContainEqual({
      type: "BOOST_CARD_REVEALED",
      cardId: "01186",
      boostValue: 0,
    });
  });
  it("mazo de encuentro vacío: la carta de impulso baraja el descarte y suma un token de aceleración", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, encounterDeck: [], encounterDiscard: ["01099"] };
    const { state: after, events } = resolveVillainActivation(
      state,
      "player-1",
    );
    expect(after.schemes[0].threat).toBe(3);
    const mainScheme = after.schemes.find((s) => s.isMain)!;
    expect(mainScheme.accelerationTokens).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "ENCOUNTER_DECK_RESHUFFLED" }),
    );
  });
  it("los esbirros atacan con su valor impreso, sin carta de impulso (no son Villanesco)", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      players: [{ ...base.players[0], form: "HERO" as const }],
      encounterDeck: ["01099"],
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
    const { state: after } = resolveVillainActivation(state, "player-1");
    expect(after.players[0].health).toBe(5);
  });
});

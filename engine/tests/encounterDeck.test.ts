import { describe, it, expect, vi, afterEach } from "vitest";
import { createGame, createSpiderManVsRhinoGame } from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import {
  drawFromEncounterDeck,
  seededShuffle,
} from "../src/game/encounterDeck";
import { RHINO_SCENARIO } from "../src/scenarios/rhino";
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

// El motor no usa Math.random: rebarajar el descarte usa la semilla guardada
// en el estado (encounterShuffleSeed), que la app elige al crear la partida.
describe("Barajado sembrado del mazo de encuentros", () => {
  const P1: PlayerSetup[] = [
    {
      id: "player-1",
      heroName: "Spider-Man",
      alterEgoName: "Peter Parker",
      health: 10,
    },
  ];
  const DISCARD = [
    "01101", "01102", "01103", "01104", "01105",
    "01106", "01107", "01108", "01186", "01187",
  ];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function reshuffle(seed: number | undefined) {
    const base = createSpiderManVsRhinoGame("player-1");
    return drawFromEncounterDeck({
      ...base,
      encounterDeck: [],
      encounterDiscard: DISCARD,
      ...(seed !== undefined && { encounterShuffleSeed: seed }),
    });
  }

  it("seededShuffle: misma semilla, mismo orden; conserva las cartas", () => {
    const a = seededShuffle(DISCARD, 42);
    const b = seededShuffle(DISCARD, 42);
    expect(a).toEqual(b);
    expect([...a.cards].sort()).toEqual([...DISCARD].sort());
    expect(a.seed).not.toBe(42);
  });

  it("seededShuffle: semillas distintas dan órdenes distintos", () => {
    expect(seededShuffle(DISCARD, 1).cards).not.toEqual(
      seededShuffle(DISCARD, 2).cards,
    );
  });

  it("rebarajar con semilla es reproducible y avanza la semilla", () => {
    const first = reshuffle(7);
    const again = reshuffle(7);
    expect(first.cardId).toBe(again.cardId);
    expect(first.state.encounterDeck).toEqual(again.state.encounterDeck);
    expect(first.state.encounterShuffleSeed).toBeDefined();
    expect(first.state.encounterShuffleSeed).not.toBe(7);
    expect([first.cardId, ...first.state.encounterDeck]).not.toEqual(DISCARD);
  });

  it("rebarajar no llama a Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    reshuffle(7);
    reshuffle(undefined);
    expect(spy).not.toHaveBeenCalled();
  });

  it("sin semilla, rebarajar conserva el orden del descarte", () => {
    const { state, cardId } = reshuffle(undefined);
    expect([cardId, ...state.encounterDeck]).toEqual(DISCARD);
    expect(state.encounterShuffleSeed).toBeUndefined();
  });

  it("createGame con semilla: baraja el mazo inicial de forma reproducible y guarda la semilla", () => {
    const a = createGame("rhino", P1, "STANDARD", { seed: 123 });
    const b = createGame("rhino", P1, "STANDARD", { seed: 123 });
    expect(a.encounterDeck).toEqual(b.encounterDeck);
    expect(a.encounterDeck).not.toEqual(RHINO_SCENARIO.encounterDeck);
    expect([...a.encounterDeck].sort()).toEqual(
      [...RHINO_SCENARIO.encounterDeck].sort(),
    );
    expect(a.encounterShuffleSeed).toBeDefined();
  });

  it("createGame sin semilla ni barajador: orden del escenario y sin semilla", () => {
    const state = createGame("rhino", P1);
    expect(state.encounterDeck).toEqual(RHINO_SCENARIO.encounterDeck);
    expect(state.encounterShuffleSeed).toBeUndefined();
  });

  it("createGame con barajador y semilla: baraja con el barajador y guarda la semilla", () => {
    const reverse = (cards: readonly string[]) => [...cards].reverse();
    const state = createGame("rhino", P1, "STANDARD", {
      shuffle: reverse,
      seed: 5,
    });
    expect(state.encounterDeck).toEqual(
      [...RHINO_SCENARIO.encounterDeck].reverse(),
    );
    expect(state.encounterShuffleSeed).toBe(5);
  });
});

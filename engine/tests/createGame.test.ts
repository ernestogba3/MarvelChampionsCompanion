import { describe, it, expect } from "vitest";
import {
  createGame,
  createSpiderManVsRhinoGame,
} from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import { getScenario } from "../src/scenarios";

const P1: PlayerSetup[] = [
  {
    id: "player-1",
    heroName: "Spider-Man",
    alterEgoName: "Peter Parker",
    health: 10,
  },
];

describe("Barajado del mazo de encuentros al crear la partida", () => {
  it("sin barajador conserva el orden del escenario (motor determinista)", () => {
    const state = createGame("klaw", P1);
    expect(state.encounterDeck).toEqual(getScenario("klaw")!.encounterDeck);
  });

  it("usa el barajador que recibe y conserva las mismas cartas", () => {
    const reverse = (cards: readonly string[]) => [...cards].reverse();
    const original = getScenario("klaw")!.encounterDeck;
    const state = createGame("klaw", P1, "STANDARD", { shuffle: reverse });
    expect(state.encounterDeck).toEqual([...original].reverse());
    expect([...state.encounterDeck].sort()).toEqual([...original].sort());
  });

  it("baraja antes de sacar los esbirros de preparación", () => {
    const reverse = (cards: readonly string[]) => [...cards].reverse();
    const state = createGame("mutagen-formula", P1, "STANDARD", {
      shuffle: reverse,
    });
    // 33 cartas − 1 Esclavo duende; la cima es la última carta del escenario.
    expect(state.encounterDeck).toHaveLength(32);
    expect(state.encounterDeck[0]).toBe("01190");
    expect(state.minions[0]!.cardId).toBe("02024");
  });
});

describe("Creación de partida inicial", () => {
  it("crea una partida de Spider-Man vs Rhino (I) con los valores base correctos", () => {
    const state = createSpiderManVsRhinoGame("player-1");

    expect(state.round).toBe(1);
    expect(state.phase).toEqual({ name: "PLAYER_PHASE" });
    expect(state.villain.name).toBe("Rhino");
    expect(state.villain.stage).toBe("I");
    expect(state.villain.health).toBe(14);
    expect(state.schemes[0]!.threatToComplete).toBe(7);
    expect(state.players[0]!.form).toBe("ALTER_EGO");
  });

  it("arranca con las 24 cartas reales del mazo de encuentro", () => {
    const state = createSpiderManVsRhinoGame("player-1");

    expect(state.encounterDeck).toHaveLength(24);
    expect(
      state.encounterDeck.filter((id: string) => id === "01106"),
    ).toHaveLength(3); // Estampida x3
    expect(
      state.encounterDeck.filter((id: string) => id === "01105"),
    ).toHaveLength(2); // "¡Soy duro!" x2
  });
});

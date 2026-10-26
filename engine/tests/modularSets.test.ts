import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import {
  ALL_MODULAR_SETS,
  getModularSet,
  modularSetCards,
} from "../src/data/modularSets";
import { getCardDefinition } from "../src/data/cards";
import { putEncounterMinionIntoPlay } from "../src/game/putCardIntoPlay";
import { RHINO_SCENARIO } from "../src/scenarios/rhino";

const P1: PlayerSetup[] = [
  { id: "player-1", heroName: "Spider-Man", alterEgoName: "Peter Parker", health: 10 },
];

describe("Registro de sets modulares", () => {
  it("el Fanático Kree tiene sus 7 cartas (5 únicas) y todas existen en el catálogo", () => {
    const set = getModularSet("kree_fanatic")!;
    expect(set.name).toBe("Fanático Kree");
    expect(set.cards).toHaveLength(7);
    expect(new Set(set.cards).size).toBe(5);
    for (const code of set.cards) {
      expect(getCardDefinition(code)).toBeDefined();
    }
  });

  it("ALL_MODULAR_SETS incluye el Fanático Kree", () => {
    expect(ALL_MODULAR_SETS.map((s) => s.id)).toContain("kree_fanatic");
  });

  it("modularSetCards concatena las cartas e ignora ids desconocidos", () => {
    expect(modularSetCards(["kree_fanatic"])).toHaveLength(7);
    expect(modularSetCards(["kree_fanatic", "noexiste"])).toHaveLength(7);
    expect(modularSetCards([])).toEqual([]);
  });
});

describe("Sets modulares en createGame", () => {
  it("sin sets modulares: el mazo es el del escenario y no hay modularSetIds", () => {
    const state = createGame("rhino", P1);
    expect(state.modularSetIds).toBeUndefined();
    expect(state.encounterDeck).toEqual(RHINO_SCENARIO.encounterDeck);
    expect(state.encounterDeck).not.toContain("90001");
  });

  it("con el Fanático Kree: sus 7 cartas se añaden al mazo de encuentros", () => {
    const base = createGame("rhino", P1);
    const withMod = createGame("rhino", P1, "STANDARD", {
      modularSetIds: ["kree_fanatic"],
    });
    expect(withMod.modularSetIds).toEqual(["kree_fanatic"]);
    expect(withMod.encounterDeck).toHaveLength(base.encounterDeck.length + 7);
    const kree = withMod.encounterDeck.filter((c) => c.startsWith("900"));
    expect(kree.sort()).toEqual(
      ["90001", "90002", "90003", "90004", "90004", "90005", "90005"].sort(),
    );
  });

  it("un id de set modular desconocido no añade cartas", () => {
    const base = createGame("rhino", P1);
    const withMod = createGame("rhino", P1, "STANDARD", {
      modularSetIds: ["noexiste"],
    });
    expect(withMod.encounterDeck).toHaveLength(base.encounterDeck.length);
  });

  it("Ronan el Acusador entra en juego con Dureza (toughOnEnter)", () => {
    const state = createGame("rhino", P1, "STANDARD", {
      modularSetIds: ["kree_fanatic"],
    });
    const next = putEncounterMinionIntoPlay(state, "90001", "player-1").state;
    const ronan = next.minions.find((m) => m.cardId === "90001");
    expect(ronan).toBeDefined();
    expect(ronan!.tough).toBe(true);
    expect(ronan!.attack).toBe(3);
    expect(ronan!.health).toBe(9);
  });
});

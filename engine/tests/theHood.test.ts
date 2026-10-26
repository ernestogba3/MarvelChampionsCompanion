import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import { addThreatStep } from "../src/game/addThreat";
import { attackVillain, checkGameOutcome } from "../src/game/playerActions";
import { putEncounterMinionIntoPlay } from "../src/game/putCardIntoPlay";
import { getCardDefinition } from "../src/data/cards";
import { getModularSet } from "../src/data/modularSets";
import type { GameState } from "../src/domain/types";

const P1: PlayerSetup[] = [
  { id: "player-1", heroName: "Spider-Man", alterEgoName: "Peter Parker", health: 10 },
];
const P2: PlayerSetup[] = [
  ...P1,
  { id: "player-2", heroName: "She-Hulk", alterEgoName: "Jennifer Walters", health: 15 },
];

function mainScheme(state: GameState) {
  return state.schemes.find((s) => s.isMain)!;
}

describe("Escenario The Hood", () => {
  it("empieza en estadio I con El Encapuchado (1/1, 14 PG por jugador)", () => {
    const state = createGame("the-hood", P1);
    expect(state.villain.name).toBe("El Encapuchado");
    expect(state.villain.stage).toBe("I");
    expect(state.villain.attack).toBe(1);
    expect(state.villain.scheme).toBe(1);
    expect(state.villain.health).toBe(14);
  });

  it("los PG del villano escalan ×jugadores", () => {
    expect(createGame("the-hood", P2).villain.health).toBe(28);
  });

  it("plan principal: etapa 1 con amenaza inicial 1 y umbral 5, ambos por jugador", () => {
    const s1 = createGame("the-hood", P1);
    expect(mainScheme(s1).cardId).toBe("24004");
    expect(mainScheme(s1).threat).toBe(1);
    expect(mainScheme(s1).threatToComplete).toBe(5);
    const s2 = createGame("the-hood", P2);
    expect(mainScheme(s2).threat).toBe(2);
    expect(mainScheme(s2).threatToComplete).toBe(10);
  });

  it("el plan principal avanza de etapa por umbral, con la amenaza inicial de la nueva", () => {
    let state = createGame("the-hood", P1);
    // Forzamos amenaza hasta pasar el umbral de la etapa 1 (5).
    state = { ...state, schemes: state.schemes.map((s) => (s.isMain ? { ...s, threat: 4 } : s)) };
    state = addThreatStep(state).state; // +1 (aceleración 1×1) → 5 ≥ umbral
    const ms = mainScheme(state);
    expect(ms.cardId).toBe("24005"); // Promesa de prosperidad
    expect(ms.threat).toBe(2); // amenaza inicial de la etapa 2 (2×1)
    expect(ms.threatToComplete).toBe(8);
  });

  it("completar la etapa final es derrota; antes, no", () => {
    let state = createGame("the-hood", P1); // Estándar: final = II
    // Lleva el plan a la etapa 3 (Estado criminal) y pásalo de umbral.
    state = {
      ...state,
      schemes: state.schemes.map((s) =>
        s.isMain
          ? { ...s, cardId: "24006", threat: 10, threatToComplete: 10, name: "Estado criminal" }
          : s,
      ),
    };
    expect(checkGameOutcome(state)).toBe("LOSS");
  });

  it("al derrotar el estadio I (Estándar) avanza a II, no es victoria", () => {
    const state = createGame("the-hood", P1);
    const after = attackVillain(state, "player-1", 14).state;
    expect(after.villain.stage).toBe("II");
    expect(checkGameOutcome(after)).toBe("ONGOING");
  });

  it("Madame Máscara entra con Guardia; Martinete (modular), con Represalia 1", () => {
    const state = createGame("the-hood", P1, "STANDARD", {
      modularSetIds: ["wrecking_crew_modular"],
    });
    const withMask = putEncounterMinionIntoPlay(state, "24010", "player-1").state;
    expect(withMask.minions.find((m) => m.cardId === "24010")!.guard).toBe(true);
    const withPile = putEncounterMinionIntoPlay(state, "24067", "player-1").state;
    expect(withPile.minions.find((m) => m.cardId === "24067")!.retaliate).toBe(1);
  });

  it("Guardia acorazado (modular) entra con Guardia y Dureza", () => {
    const state = createGame("the-hood", P1, "STANDARD", {
      modularSetIds: ["ransacked_armory"],
    });
    const m = putEncounterMinionIntoPlay(state, "24041", "player-1").state.minions.find(
      (x) => x.cardId === "24041",
    )!;
    expect(m.guard).toBe(true);
    expect(m.tough).toBe(true);
  });
});

describe("Sets modulares de The Hood", () => {
  const SETS = [
    "beasty_boys",
    "brothers_grimm",
    "crossfire_crew",
    "mister_hyde",
    "ransacked_armory",
    "sinister_syndicate",
    "state_of_emergency",
    "streets_of_mayhem",
    "wrecking_crew_modular",
  ];

  it("los 9 sets están registrados y sus cartas existen en el catálogo", () => {
    for (const id of SETS) {
      const set = getModularSet(id);
      expect(set, id).toBeDefined();
      for (const code of set!.cards) {
        expect(getCardDefinition(code), `${id}:${code}`).toBeDefined();
      }
    }
  });

  it("elegir varios sets modulares añade todas sus cartas al mazo", () => {
    const base = createGame("the-hood", P1);
    const chosen = ["mister_hyde", "sinister_syndicate"];
    const extra =
      getModularSet("mister_hyde")!.cards.length +
      getModularSet("sinister_syndicate")!.cards.length;
    const withMods = createGame("the-hood", P1, "STANDARD", { modularSetIds: chosen });
    expect(withMods.modularSetIds).toEqual(chosen);
    expect(withMods.encounterDeck).toHaveLength(base.encounterDeck.length + extra);
  });

  it("las cartas de Oleada impresa están marcadas (Aniquilación total, entornos)", () => {
    for (const code of ["24054", "24060", "24061", "24062", "24063", "24029", "24032"]) {
      expect(getCardDefinition(code)!.surge, code).toBe(true);
    }
    // 'Gana Oleada' condicional NO se marca.
    expect(getCardDefinition("24039")!.surge).toBeUndefined();
    expect(getCardDefinition("24040")!.surge).toBeUndefined();
  });
});

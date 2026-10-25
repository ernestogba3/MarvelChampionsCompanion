import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import { putCardIntoPlay } from "../src/game/putCardIntoPlay";
import { addThreatStep } from "../src/game/addThreat";
import { thwartScheme } from "../src/game/playerActions";
import { advanceToNextStep } from "../src/game/advancePhase";
import {
  canRemoveThreatFromMainScheme,
  hazardIconsInPlay,
} from "../src/game/sideSchemes";
import type { GameState } from "../src/domain/types";

const P1: PlayerSetup[] = [
  {
    id: "player-1",
    heroName: "Spider-Man",
    alterEgoName: "Peter Parker",
    health: 10,
  },
];
const P2: PlayerSetup[] = [
  ...P1,
  {
    id: "player-2",
    heroName: "She-Hulk",
    alterEgoName: "Jennifer Walters",
    health: 15,
  },
];

function atStep(
  state: GameState,
  step: "VILLAIN_ACTIVATION" | "DEAL_ENCOUNTER_CARDS",
): GameState {
  return { ...state, phase: { name: "VILLAIN_PHASE", step } };
}

describe("Amenaza inicial por jugador ([per_hero])", () => {
  it("Control de multitudes (Core) entra con 2×jugadores", () => {
    const base = createGame("rhino", P2, "STANDARD");
    const { state } = putCardIntoPlay(base, "01108", "player-1");
    expect(state.schemes.find((s) => s.cardId === "01108")!.threat).toBe(4);
  });

  it("Klaw 'el inmortal' entra con 3×jugadores", () => {
    const base = createGame("klaw", P2, "STANDARD");
    const { state } = putCardIntoPlay(base, "01127", "player-1");
    expect(state.schemes.find((s) => s.cardId === "01127")!.threat).toBe(6);
  });

  it("Red de defensa (amenaza fija) no escala", () => {
    const base = createGame("klaw", P2, "STANDARD");
    const { state } = putCardIntoPlay(base, "01125", "player-1");
    expect(state.schemes.find((s) => s.cardId === "01125")!.threat).toBe(2);
  });

  it("dos copias del mismo plan secundario tienen ids distintos", () => {
    const base = createGame("risky-business", P1, "STANDARD");
    const once = putCardIntoPlay(base, "02010", "player-1").state;
    const twice = putCardIntoPlay(once, "02010", "player-1").state;
    const ids = twice.schemes.filter((s) => s.cardId === "02010").map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("Icono de Aceleración", () => {
  it("cada icono añade +1 de amenaza al plan principal en el paso 1", () => {
    const base = createGame("rhino", P1, "STANDARD");
    // Horda imparable: 2 iconos de Aceleración.
    const withOverrun = putCardIntoPlay(base, "02028", "player-1").state;
    const { state } = addThreatStep(withOverrun);
    // Aceleración impresa 1×1 + 2 iconos.
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(3);
  });

  it("los iconos no escalan por jugadores", () => {
    const base = createGame("klaw", P2, "STANDARD");
    const withImmortal = putCardIntoPlay(base, "01127", "player-1").state;
    const { state } = addThreatStep(withImmortal);
    // Aceleración impresa 1×2 + 1 icono.
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(3);
  });
});

describe("Icono de Crisis", () => {
  it("Red de defensa impide quitar amenaza del plan principal", () => {
    const base = createGame("klaw", P1, "STANDARD");
    const withMainThreat: GameState = {
      ...base,
      schemes: base.schemes.map((s) => (s.isMain ? { ...s, threat: 3 } : s)),
    };
    const crisis = putCardIntoPlay(withMainThreat, "01125", "player-1").state;
    expect(canRemoveThreatFromMainScheme(crisis)).toBe(false);
    const main = crisis.schemes.find((s) => s.isMain)!;
    const { state } = thwartScheme(crisis, main.id, 2);
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(3);
  });

  it("Puente inestable también tiene Crisis", () => {
    const base = createGame("risky-business", P1, "STANDARD");
    const crisis = putCardIntoPlay(base, "02009", "player-1").state;
    expect(canRemoveThreatFromMainScheme(crisis)).toBe(false);
  });
});

describe("Icono de Peligro", () => {
  it("al entrar en el paso de reparto se encola 1 carta extra por icono", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const withBreakin = putCardIntoPlay(base, "01107", "player-1").state;
    expect(hazardIconsInPlay(withBreakin)).toBe(1);
    const next = advanceToNextStep(atStep(withBreakin, "VILLAIN_ACTIVATION"));
    expect(next.phase).toEqual({
      name: "VILLAIN_PHASE",
      step: "DEAL_ENCOUNTER_CARDS",
    });
    expect(next.pendingEncounterDeals).toEqual(["player-1"]);
  });

  it("varios iconos se reparten en orden de jugadores desde el jugador inicial", () => {
    const base = createGame("risky-business", P2, "STANDARD");
    const secondFirst: GameState = { ...base, firstPlayerId: "player-2" };
    const once = putCardIntoPlay(secondFirst, "02011", "player-1").state;
    const twice = putCardIntoPlay(once, "02011", "player-1").state;
    const next = advanceToNextStep(atStep(twice, "VILLAIN_ACTIVATION"));
    expect(next.pendingEncounterDeals).toEqual(["player-2", "player-1"]);
  });

  it("el plan principal también cuenta (Adquisición corporativa)", () => {
    const base = createGame("risky-business", P1, "STANDARD");
    const stageTwo: GameState = {
      ...base,
      schemes: base.schemes.map((s) =>
        s.isMain ? { ...s, cardId: "02005b" } : s,
      ),
    };
    expect(hazardIconsInPlay(stageTwo)).toBe(1);
  });

  it("sin iconos no se encola nada", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const next = advanceToNextStep(atStep(base, "VILLAIN_ACTIVATION"));
    expect(next.pendingEncounterDeals).toEqual([]);
  });
});

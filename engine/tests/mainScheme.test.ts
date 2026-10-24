import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import {
  advanceMainSchemeIfComplete,
  isMainSchemeFinalStage,
} from "../src/game/mainScheme";
import { addThreatStep } from "../src/game/addThreat";
import { resolveVillainActivation } from "../src/game/villainActivation";
import { checkGameOutcome } from "../src/game/playerActions";
import type { GameState } from "../src/domain/types";
import type { PlayerSetup } from "../src/game/createGame";

const P1: PlayerSetup[] = [
  {
    id: "player-1",
    heroName: "Spider-Man",
    alterEgoName: "Peter Parker",
    health: 10,
  },
];
const P2: PlayerSetup[] = [
  { id: "player-1", heroName: "A", alterEgoName: "a", health: 10 },
  { id: "player-2", heroName: "B", alterEgoName: "b", health: 10 },
];

// Pone una amenaza concreta en el plan principal.
function withMainThreat(state: GameState, threat: number): GameState {
  return {
    ...state,
    schemes: state.schemes.map((s) => (s.isMain ? { ...s, threat } : s)),
  };
}

describe("advanceMainSchemeIfComplete — plan principal multi-etapa (Klaw)", () => {
  it("avanza de la etapa 1 a la etapa 2 al alcanzar el umbral", () => {
    const base = createGame("klaw", P1, "STANDARD");
    const complete = withMainThreat(base, 6); // umbral etapa 1 = 6 (1 jugador)
    const { state, events } = advanceMainSchemeIfComplete(complete);

    const main = state.schemes.find((s) => s.isMain)!;
    expect(main.cardId).toBe("01117"); // Reunión secreta
    expect(main.name).toBe("Reunión secreta");
    expect(main.threat).toBe(0); // reinicia al valor inicial de la etapa 2
    expect(main.threatToComplete).toBe(8); // 8 × 1 jugador
    expect(events).toEqual([
      {
        type: "MAIN_SCHEME_ADVANCED",
        from: "01116",
        to: "01117",
        schemeId: "main-secret-rendezvous",
      },
    ]);
  });

  it("escala el umbral de la etapa 2 por número de jugadores", () => {
    const base = createGame("klaw", P2, "STANDARD");
    const complete = withMainThreat(base, 12); // umbral etapa 1 = 6 × 2 = 12
    const { state } = advanceMainSchemeIfComplete(complete);
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main.cardId).toBe("01117");
    expect(main.threatToComplete).toBe(16); // 8 × 2
  });

  it("conserva los tokens de aceleración al avanzar", () => {
    const base = createGame("klaw", P1, "STANDARD");
    const withTokens: GameState = {
      ...base,
      schemes: base.schemes.map((s) =>
        s.isMain ? { ...s, threat: 6, accelerationTokens: 2 } : s,
      ),
    };
    const { state } = advanceMainSchemeIfComplete(withTokens);
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main.accelerationTokens).toBe(2);
  });

  it("no avanza si la etapa 1 aún no ha llegado al umbral", () => {
    const base = createGame("klaw", P1, "STANDARD");
    const notYet = withMainThreat(base, 5);
    const { state, events } = advanceMainSchemeIfComplete(notYet);
    expect(state).toBe(notYet);
    expect(events).toEqual([]);
  });

  it("no avanza si ya está en la etapa final (la derrota la marca checkGameOutcome)", () => {
    const base = createGame("klaw", P1, "STANDARD");
    // Forzar el plan a la etapa 2 (final) y completarla.
    const atFinal = advanceMainSchemeIfComplete(withMainThreat(base, 6)).state;
    const finalComplete = withMainThreat(atFinal, 8);
    const { state, events } = advanceMainSchemeIfComplete(finalComplete);
    expect(state).toBe(finalComplete);
    expect(events).toEqual([]);
  });
});

describe("advanceMainSchemeIfComplete — Rino (plan de una sola etapa)", () => {
  it("no avanza nunca aunque se complete", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const complete = withMainThreat(base, 7); // umbral Rino = 7
    const { state, events } = advanceMainSchemeIfComplete(complete);
    expect(state).toBe(complete);
    expect(events).toEqual([]);
  });
});

describe("isMainSchemeFinalStage", () => {
  it("Rino siempre está en etapa final (plan de una etapa)", () => {
    const base = createGame("rhino", P1, "STANDARD");
    expect(isMainSchemeFinalStage(base)).toBe(true);
  });

  it("Klaw: la etapa 1 NO es final, la etapa 2 sí", () => {
    const base = createGame("klaw", P1, "STANDARD");
    expect(isMainSchemeFinalStage(base)).toBe(false);
    const atFinal = advanceMainSchemeIfComplete(withMainThreat(base, 6)).state;
    expect(isMainSchemeFinalStage(atFinal)).toBe(true);
  });
});

describe("checkGameOutcome con planes multi-etapa", () => {
  it("Klaw: completar la etapa 1 NO es derrota", () => {
    const base = createGame("klaw", P1, "STANDARD");
    expect(checkGameOutcome(withMainThreat(base, 6))).toBe("ONGOING");
  });

  it("Klaw: completar la etapa 2 (final) SÍ es derrota", () => {
    const base = createGame("klaw", P1, "STANDARD");
    const atFinal = advanceMainSchemeIfComplete(withMainThreat(base, 6)).state;
    expect(checkGameOutcome(withMainThreat(atFinal, 8))).toBe("LOSS");
  });

  it("Rino: completar su único plan principal es derrota", () => {
    const base = createGame("rhino", P1, "STANDARD");
    expect(checkGameOutcome(withMainThreat(base, 7))).toBe("LOSS");
  });
});

describe("integración: el avance se dispara automáticamente al añadir amenaza", () => {
  it("addThreatStep avanza la etapa cuando con la aceleración se completa", () => {
    const base = createGame("klaw", P1, "STANDARD");
    // Etapa 1: umbral 6, aceleración impresa 1 × 1 jugador = +1 por ronda.
    const almost = withMainThreat(base, 5);
    const { state } = addThreatStep(almost);
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main.cardId).toBe("01117"); // avanzó a la etapa 2
    expect(main.threat).toBe(0);
  });

  it("la planificación del villano (alter ego) también avanza la etapa", () => {
    const base = createGame("klaw", P1, "STANDARD");
    // Jugador en alter ego → el villano planifica (scheme 2 + boost). Con un
    // mazo de cartas de boost 0, la amenaza sube exactamente villain.scheme=2.
    const almost: GameState = {
      ...withMainThreat(base, 5),
      players: base.players.map((p) => ({ ...p, form: "ALTER_EGO" as const })),
      encounterDeck: ["01186", "01186", "01186"], // boost 0 cada una
    };
    const { state } = resolveVillainActivation(almost, "player-1");
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main.cardId).toBe("01117"); // 5 + 2 = 7 ≥ 6 → avanzó
  });
});

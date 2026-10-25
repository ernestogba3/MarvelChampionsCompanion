import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import { resolveVillainActivation } from "../src/game/villainActivation";
import { attackVillain, checkGameOutcome } from "../src/game/playerActions";
import { addThreatStep } from "../src/game/addThreat";
import { putEncounterMinionIntoPlay } from "../src/game/putCardIntoPlay";
import { revealPendingCardsForPlayer } from "../src/game/revealEncounterCards";
import {
  countEnemiesWithTrait,
  mainSchemeThreatPerRound,
} from "../src/game/mainScheme";
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

function withMainThreat(state: GameState, threat: number): GameState {
  return {
    ...state,
    schemes: state.schemes.map((s) => (s.isMain ? { ...s, threat } : s)),
  };
}

// Sin esbirros en juego (p.ej. tras derrotar al Esclavo duende con Guardia de
// la preparación), para poder atacar al villano.
function withoutMinions(state: GameState): GameState {
  return { ...state, minions: [] };
}

// Partida de 1 jugador ya en la etapa 2 (Nube de mutágeno).
function mutagenCloudGame(): GameState {
  const base = createGame("mutagen-formula", P1, "STANDARD");
  return addThreatStep(withMainThreat(base, 6)).state;
}

describe("La fórmula mutagénica — creación del escenario", () => {
  it("1 jugador: Duende Verde (I) con 16 PG y un Esclavo duende con Guardia", () => {
    const state = createGame("mutagen-formula", P1, "STANDARD");
    expect(state.scenarioId).toBe("mutagen-formula");
    expect(state.villain).toMatchObject({
      name: "Green Goblin",
      cardId: "02014",
      health: 16,
      attack: 2,
      scheme: 1,
    });
    expect(state.environment).toBeUndefined();
    expect(state.minions).toHaveLength(1);
    expect(state.minions[0]).toMatchObject({
      cardId: "02024",
      name: "Esclavo duende",
      engagedWith: "player-1",
      guard: true,
    });
    // El Esclavo sale del mazo de encuentros (33 − 1).
    expect(state.encounterDeck).toHaveLength(32);
    expect(state.encounterDeck.filter((c) => c === "02024")).toHaveLength(5);
    expect(state.schemes.find((s) => s.isMain)).toMatchObject({
      cardId: "02017b",
      threat: 2,
      threatToComplete: 7,
    });
  });

  it("2 jugadores: un Esclavo por jugador, PG / amenaza inicial / umbral ×2", () => {
    const state = createGame("mutagen-formula", P2, "STANDARD");
    expect(state.villain.health).toBe(32);
    expect(state.minions.map((m) => m.engagedWith)).toEqual([
      "player-1",
      "player-2",
    ]);
    expect(new Set(state.minions.map((m) => m.id)).size).toBe(2);
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main.threat).toBe(4);
    expect(main.threatToComplete).toBe(14);
  });

  it("Experto: empieza en el II y su 'Cuando se muestre' reparte 2 cartas a cada jugador", () => {
    const state = createGame("mutagen-formula", P2, "EXPERT");
    expect(state.villain).toMatchObject({ stage: "II", cardId: "02015" });
    expect(state.pendingEncounterDeals).toEqual([
      "player-1",
      "player-1",
      "player-2",
      "player-2",
    ]);
  });
});

describe("La fórmula mutagénica — villano", () => {
  it("tras atacar e infligir daño, coloca 1 de amenaza en el plan principal", () => {
    const base = createGame("mutagen-formula", P1, "STANDARD");
    const hero: GameState = {
      ...base,
      players: base.players.map((p) => ({ ...p, form: "HERO" })),
    };
    const { state, events } = resolveVillainActivation(hero, "player-1");
    // ATQ 2 + aumento del Planeador duende (3).
    expect(events).toContainEqual({
      type: "VILLAIN_ATTACKED",
      playerId: "player-1",
      amount: 5,
    });
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(3);
  });

  it("en alter ego maquina sin la amenaza extra", () => {
    const base = createGame("mutagen-formula", P1, "STANDARD");
    const { state } = resolveVillainActivation(base, "player-1");
    // 2 inicial + PLA 1 + aumento 3.
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(6);
  });

  it("el Esclavo duende de la preparación (Guardia) impide atacar al villano", () => {
    const base = createGame("mutagen-formula", P1, "STANDARD");
    const { state, events } = attackVillain(base, "player-1", 5);
    expect(state.villain.health).toBe(16);
    expect(events[0]).toMatchObject({ type: "ATTACK_BLOCKED_BY_GUARD" });
  });

  it("al derrotar el estadio I entra el II y reparte 2 cartas de encuentro a cada jugador", () => {
    const base = withoutMinions(createGame("mutagen-formula", P1, "STANDARD"));
    const { state } = attackVillain(base, "player-1", 16);
    expect(state.villain).toMatchObject({
      stage: "II",
      cardId: "02015",
      health: 18,
    });
    expect(state.pendingEncounterDeals).toEqual(["player-1", "player-1"]);
  });

  it("Estándar: derrotar el estadio II es la victoria", () => {
    const base = withoutMinions(createGame("mutagen-formula", P1, "STANDARD"));
    const stageTwo = attackVillain(base, "player-1", 16).state;
    const { state } = attackVillain(stageTwo, "player-1", 18);
    expect(checkGameOutcome(state)).toBe("WIN");
  });
});

describe("La fórmula mutagénica — plan principal", () => {
  it("Liberar el mutágeno avanza a Nube de mutágeno (4×jugadores / 11×jugadores)", () => {
    const state = mutagenCloudGame();
    expect(state.schemes.find((s) => s.isMain)).toMatchObject({
      cardId: "02018b",
      threat: 4,
      threatToComplete: 11,
    });
  });

  it("la aceleración de Nube de mutágeno es el nº de enemigos Duende (villano incluido)", () => {
    const state = mutagenCloudGame();
    // Duende Verde + 1 Esclavo duende.
    expect(countEnemiesWithTrait(state, "Goblin")).toBe(2);
    expect(mainSchemeThreatPerRound(state)).toBe(2);
    const more = putEncounterMinionIntoPlay(state, "02023", "player-1").state;
    expect(mainSchemeThreatPerRound(more)).toBe(3);
    const { state: after } = addThreatStep(more);
    expect(after.schemes.find((s) => s.isMain)!.threat).toBe(7);
  });

  it("la aceleración X no escala por jugadores", () => {
    const base = createGame("mutagen-formula", P2, "STANDARD");
    const cloud = addThreatStep(withMainThreat(base, 13)).state;
    expect(cloud.schemes.find((s) => s.isMain)!.cardId).toBe("02018b");
    // Duende Verde + 2 Esclavos.
    expect(mainSchemeThreatPerRound(cloud)).toBe(3);
  });

  it("completar Nube de mutágeno es la derrota", () => {
    const cloud = mutagenCloudGame();
    expect(checkGameOutcome(withMainThreat(cloud, 11))).toBe("LOSS");
  });
});

describe("La fórmula mutagénica — cartas", () => {
  it("Duendes de refuerzo: +1 de amenaza por cada esbirro Duende en juego", () => {
    const base = createGame("mutagen-formula", P1, "STANDARD");
    const revealing: GameState = {
      ...base,
      players: base.players.map((p) => ({
        ...p,
        faceDownEncounterCards: ["02026"],
      })),
    };
    const { state } = revealPendingCardsForPlayer(revealing, "player-1");
    // Amenaza inicial fija 2 + 1 Esclavo duende.
    expect(state.schemes.find((s) => s.cardId === "02026")!.threat).toBe(3);
  });

  it("Nación duende y Horda imparable entran con amenaza ×jugadores", () => {
    const base = createGame("mutagen-formula", P2, "STANDARD");
    const revealing: GameState = {
      ...base,
      players: base.players.map((p) =>
        p.id === "player-1"
          ? { ...p, faceDownEncounterCards: ["02027", "02028"] }
          : p,
      ),
    };
    const { state } = revealPendingCardsForPlayer(revealing, "player-1");
    expect(state.schemes.find((s) => s.cardId === "02027")!.threat).toBe(4);
    expect(state.schemes.find((s) => s.cardId === "02028")!.threat).toBe(2);
  });
});

describe("putEncounterMinionIntoPlay", () => {
  it("saca el esbirro del mazo de encuentros y lo enfrenta al jugador", () => {
    const base = createGame("mutagen-formula", P1, "STANDARD");
    const { state, events } = putEncounterMinionIntoPlay(
      base,
      "02025",
      "player-1",
    );
    expect(state.encounterDeck).not.toContain("02025");
    expect(state.minions[1]).toMatchObject({
      cardId: "02025",
      name: "Monstruo",
      engagedWith: "player-1",
    });
    expect(events[0]).toMatchObject({
      type: "MINION_ENTERED_PLAY",
      cardId: "02025",
    });
  });

  it("si no queda en el mazo, lo saca del descarte", () => {
    const base = createGame("mutagen-formula", P1, "STANDARD");
    const discarded: GameState = {
      ...base,
      encounterDeck: base.encounterDeck.filter((c) => c !== "02025"),
      encounterDiscard: ["02025"],
    };
    const { state } = putEncounterMinionIntoPlay(discarded, "02025", "player-1");
    expect(state.encounterDiscard).toEqual([]);
    expect(state.minions).toHaveLength(2);
  });

  it("no hace nada con una carta que no es esbirro o sin copias", () => {
    const base = createGame("mutagen-formula", P1, "STANDARD");
    expect(putEncounterMinionIntoPlay(base, "02029", "player-1").state).toBe(
      base,
    );
    expect(putEncounterMinionIntoPlay(base, "01101", "player-1").state).toBe(
      base,
    );
  });
});

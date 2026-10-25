import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import { resolveVillainActivation } from "../src/game/villainActivation";
import { attackVillain, checkGameOutcome } from "../src/game/playerActions";
import { addThreatStep } from "../src/game/addThreat";
import { initPlayerLibrary } from "../src/game/playerLibrary";
import { revealPendingCardsForPlayer } from "../src/game/revealEncounterCards";
import {
  adjustEnvironmentCounters,
  placeOrElseRemoveEnvironmentCounters,
  faceForNextStage,
} from "../src/game/villainFaces";
import { getScenarioForState } from "../src/scenarios";
import {
  serializeGameState,
  deserializeGameState,
} from "../src/persistence/serialize";
import type { GameState, PlayerForm } from "../src/domain/types";

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

function withForm(state: GameState, form: PlayerForm): GameState {
  return { ...state, players: state.players.map((p) => ({ ...p, form })) };
}

function makeDeck(size = 40): Record<string, number> {
  const cards: Record<string, number> = {};
  for (let i = 0; i < size; i++)
    cards[`card-${String(i).padStart(2, "0")}`] = 1;
  return cards;
}

// Partida estándar de 1 jugador con el villano ya convertido en Duende Verde
// (se quitan las 2 de Infamia atacando a Norman). Jugador en alter ego, así
// que el "Cuando se muestre" del Duende I (solo forma de Héroe) no le afecta.
function goblinGame(): GameState {
  const base = createGame("risky-business", P1, "STANDARD");
  return attackVillain(base, "player-1", 2).state;
}

describe("Negocios arriesgados — creación del escenario", () => {
  it("1 jugador: Norman Osborn (I), Empresa criminal con 2 de Infamia y OPA hostil 2/7", () => {
    const state = createGame("risky-business", P1, "STANDARD");
    expect(state.scenarioId).toBe("risky-business");
    expect(state.villain).toMatchObject({
      name: "Norman Osborn",
      cardId: "02001a",
      face: "A",
      stage: "I",
      health: 14,
      maxHealth: 14,
      attack: 0,
      scheme: 2,
    });
    expect(state.environment).toEqual({
      cardId: "02006a",
      name: "Empresa criminal",
      face: "A",
      counterName: "Infamia",
      counters: 2,
    });
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main).toMatchObject({
      cardId: "02004b",
      threat: 2,
      threatToComplete: 7,
    });
    expect(state.encounterDeck).toHaveLength(25);
  });

  it("2 jugadores: PG, Infamia, amenaza inicial y umbral escalan ×2", () => {
    const state = createGame("risky-business", P2, "STANDARD");
    expect(state.villain.health).toBe(28);
    expect(state.environment?.counters).toBe(4);
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main.threat).toBe(4);
    expect(main.threatToComplete).toBe(14);
  });

  it("Experto: empieza en Norman Osborn (II)", () => {
    const state = createGame("risky-business", P1, "EXPERT");
    expect(state.villain).toMatchObject({
      stage: "II",
      cardId: "02002a",
      health: 18,
    });
  });
});

describe("Negocios arriesgados — Interrupciones de Norman Osborn", () => {
  it("cuando Norman va a atacar, coloca Infamia en vez de atacar (sin aumento)", () => {
    const base = withForm(
      createGame("risky-business", P1, "STANDARD"),
      "HERO",
    );
    const { state, events } = resolveVillainActivation(base, "player-1");
    expect(state.players[0]!.health).toBe(10);
    expect(state.environment?.counters).toBe(3);
    expect(state.encounterDeck).toHaveLength(base.encounterDeck.length);
    expect(events.some((e) => e.type === "BOOST_CARD_REVEALED")).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "VILLAIN_ACTIVATION_REPLACED",
        replaced: "ATTACK",
        delta: 1,
      }),
    );
    // El jugador sigue recibiendo su carta de encuentro.
    expect(state.pendingEncounterDeals).toEqual(["player-1"]);
  });

  it("en alter ego Norman maquina con normalidad (PLA 2 + aumento)", () => {
    const base = createGame("risky-business", P1, "STANDARD");
    const { state } = resolveVillainActivation(base, "player-1");
    // Amenaza inicial 2 + PLA 2 + aumento de Pistolero a sueldo (2).
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(6);
  });

  it("el daño a Norman quita Infamia en vez de PG", () => {
    const base = createGame("risky-business", P1, "STANDARD");
    const { state, events } = attackVillain(base, "player-1", 1);
    expect(state.villain.health).toBe(14);
    expect(state.environment?.counters).toBe(1);
    expect(events[0]).toMatchObject({
      type: "VILLAIN_DAMAGE_REPLACED",
      amount: 1,
    });
  });
});

describe("Negocios arriesgados — volteo", () => {
  it("sin Infamia, Norman se convierte en Duende Verde y el Entorno en Estado de locura", () => {
    const base = createGame("risky-business", P1, "STANDARD");
    // 5 de daño con 2 de Infamia: se sustituye entero, el exceso se pierde.
    const { state, events } = attackVillain(base, "player-1", 5);
    expect(state.villain).toMatchObject({
      name: "Green Goblin",
      cardId: "02001b",
      face: "B",
      attack: 3,
      health: 14,
    });
    expect(state.environment).toMatchObject({
      cardId: "02006b",
      name: "Estado de locura",
      face: "B",
      counterName: "Locura",
      counters: 2,
    });
    expect(events).toContainEqual(
      expect.objectContaining({ type: "VILLAIN_FLIPPED", to: "Green Goblin" }),
    );
  });

  it("Duende Verde (I) al mostrarse: 3 de daño indirecto solo a quien está en forma de Héroe", () => {
    const base = createGame("risky-business", P2, "STANDARD");
    const mixed: GameState = {
      ...base,
      players: base.players.map((p) =>
        p.id === "player-1" ? { ...p, form: "HERO" } : p,
      ),
    };
    const { state } = attackVillain(mixed, "player-1", 4);
    expect(state.players[0]!.health).toBe(7);
    expect(state.players[1]!.health).toBe(15);
  });

  it("el escenario se sigue encontrando aunque el villano cambie de nombre", () => {
    const state = goblinGame();
    expect(state.villain.name).toBe("Green Goblin");
    expect(getScenarioForState(state)?.id).toBe("risky-business");
  });

  it("el Duende sí sufre daño", () => {
    const { state } = attackVillain(goblinGame(), "player-1", 4);
    expect(state.villain.health).toBe(10);
  });

  it("cuando el Duende va a maquinar, quita Locura y no añade amenaza", () => {
    const base = goblinGame();
    const threatBefore = base.schemes.find((s) => s.isMain)!.threat;
    const { state } = resolveVillainActivation(base, "player-1");
    expect(state.environment?.counters).toBe(1);
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(threatBefore);
  });

  it("sin Locura, el Duende vuelve a Norman (conserva el daño) y Empresa criminal vuelve con 2×jugadores", () => {
    const damaged = attackVillain(goblinGame(), "player-1", 4).state;
    const once = resolveVillainActivation(damaged, "player-1").state;
    const { state } = resolveVillainActivation(once, "player-1");
    expect(state.villain).toMatchObject({
      name: "Norman Osborn",
      cardId: "02001a",
      face: "A",
      health: 10,
    });
    expect(state.environment).toMatchObject({
      name: "Empresa criminal",
      counters: 2,
    });
  });

  it("el Duende en forma de Héroe ataca con ATQ 3 + aumento", () => {
    const base = withForm(goblinGame(), "HERO");
    const { state } = resolveVillainActivation(base, "player-1");
    // ATQ 3 + aumento del Pistolero a sueldo (2) = 5.
    expect(state.players[0]!.health).toBe(5);
  });

  it("ajuste manual de contadores: llegar a 0 también da la vuelta", () => {
    const base = createGame("risky-business", P1, "STANDARD");
    const { state } = adjustEnvironmentCounters(base, -2);
    expect(state.villain.face).toBe("B");
  });
});

describe("Negocios arriesgados — estadios", () => {
  it("al derrotar al Duende (I), el estadio II entra por la cara Duende y hace 4 de daño indirecto a cada jugador", () => {
    const goblin = goblinGame();
    const madness = goblin.environment!.counters;
    const { state } = attackVillain(goblin, "player-1", 14);
    expect(faceForNextStage("B")).toBe("B");
    expect(state.villain).toMatchObject({
      stage: "II",
      name: "Green Goblin",
      cardId: "02002b",
      face: "B",
      attack: 4,
      health: 18,
    });
    // El Entorno no cambia: Estado de locura conserva sus contadores.
    expect(state.environment).toMatchObject({
      name: "Estado de locura",
      counters: madness,
    });
    // Alter ego incluido: el Duende II hace daño a cada jugador.
    expect(state.players[0]!.health).toBe(6);
  });

  it("Estándar: derrotar al Duende Verde (II) es la victoria", () => {
    const stageTwo = attackVillain(goblinGame(), "player-1", 14).state;
    const { state } = attackVillain(stageTwo, "player-1", 18);
    expect(checkGameOutcome(state)).toBe("WIN");
  });

  it("Experto: el Duende Verde (III) inflige 4 de daño directo al mostrarse", () => {
    const expert = createGame("risky-business", P1, "EXPERT");
    // Norman II → Duende II (1 jugador: Empresa criminal empieza con 2).
    const goblin = attackVillain(expert, "player-1", 2).state;
    expect(goblin.villain.cardId).toBe("02002b");
    const healthBefore = goblin.players[0]!.health;
    const { state } = attackVillain(goblin, "player-1", 18);
    expect(state.villain).toMatchObject({ stage: "III", cardId: "02003b" });
    expect(state.players[0]!.health).toBe(healthBefore - 4);
  });
});

describe("Negocios arriesgados — plan principal", () => {
  it("al completar OPA hostil: +1×jugadores de Infamia, descarte del mazo y avance a Adquisición corporativa", () => {
    const base = initPlayerLibrary(
      createGame("risky-business", P1, "STANDARD"),
      "player-1",
      makeDeck(40),
    ).state;
    const nearlyDone: GameState = {
      ...base,
      schemes: base.schemes.map((s) => (s.isMain ? { ...s, threat: 6 } : s)),
    };
    const libraryBefore = nearlyDone.players[0]!.library!.length;
    const { state, events } = addThreatStep(nearlyDone);
    expect(state.environment?.counters).toBe(3);
    expect(state.players[0]!.library).toHaveLength(libraryBefore - 3);
    expect(state.players[0]!.discardPile).toHaveLength(3);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "PLAYER_DECK_MILLED", count: 3 }),
    );
    const main = state.schemes.find((s) => s.isMain)!;
    expect(main).toMatchObject({
      cardId: "02005b",
      threat: 1,
      threatToComplete: 10,
    });
  });

  it("si el Entorno está por Estado de locura, OPA hostil no coloca Infamia ni descarta", () => {
    const goblin = initPlayerLibrary(goblinGame(), "player-1", makeDeck(40))
      .state;
    const nearlyDone: GameState = {
      ...goblin,
      schemes: goblin.schemes.map((s) =>
        s.isMain ? { ...s, threat: 6 } : s,
      ),
    };
    const { state } = addThreatStep(nearlyDone);
    expect(state.environment?.name).toBe("Estado de locura");
    expect(state.players[0]!.discardPile).toHaveLength(0);
    expect(state.schemes.find((s) => s.isMain)!.cardId).toBe("02005b");
  });

  it("completar Adquisición corporativa es la derrota", () => {
    const base = createGame("risky-business", P1, "STANDARD");
    const lost: GameState = {
      ...base,
      schemes: base.schemes.map((s) =>
        s.isMain
          ? { ...s, cardId: "02005b", threat: 10, threatToComplete: 10 }
          : s,
      ),
    };
    expect(checkGameOutcome(lost)).toBe("LOSS");
  });
});

describe("Negocios arriesgados — cartas de encuentro", () => {
  function revealing(state: GameState, cardId: string): GameState {
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === "player-1" ? { ...p, faceDownEncounterCards: [cardId] } : p,
      ),
    };
  }

  it("Rutina laboral con Empresa criminal: +2 de Infamia", () => {
    const base = revealing(createGame("risky-business", P1, "STANDARD"), "02012");
    const { state } = revealPendingCardsForPlayer(base, "player-1");
    expect(state.environment?.counters).toBe(4);
  });

  it("Rutina laboral con Estado de locura: quita 2 de Locura (y da la vuelta)", () => {
    const base = revealing(goblinGame(), "02012");
    const { state } = revealPendingCardsForPlayer(base, "player-1");
    expect(state.villain.face).toBe("A");
    expect(state.environment?.name).toBe("Empresa criminal");
  });

  it("Industrias Oscorp con Norman: 2×jugadores + 1×jugadores de amenaza", () => {
    const base = revealing(createGame("risky-business", P2, "STANDARD"), "02010");
    const { state } = revealPendingCardsForPlayer(base, "player-1");
    const scheme = state.schemes.find((s) => s.cardId === "02010")!;
    expect(scheme.threat).toBe(6);
  });

  it("Industrias Oscorp con el Duende: solo la amenaza inicial", () => {
    const base = revealing(goblinGame(), "02010");
    const { state } = revealPendingCardsForPlayer(base, "player-1");
    expect(state.schemes.find((s) => s.cardId === "02010")!.threat).toBe(2);
  });

  it("el patrón 'coloca Infamia / si no puedes, quita Locura' depende de la cara", () => {
    const norman = createGame("risky-business", P1, "STANDARD");
    expect(
      placeOrElseRemoveEnvironmentCounters(norman, 1).state.environment
        ?.counters,
    ).toBe(3);
    expect(
      placeOrElseRemoveEnvironmentCounters(goblinGame(), 1).state.environment
        ?.counters,
    ).toBe(1);
  });

  it("el Guardia privado de seguridad entra con Guardia", () => {
    const base = revealing(createGame("risky-business", P1, "STANDARD"), "02008");
    const { state } = revealPendingCardsForPlayer(base, "player-1");
    expect(state.minions[0]).toMatchObject({ cardId: "02008", guard: true });
  });
});

describe("Negocios arriesgados — guardado", () => {
  it("serializar y cargar conserva escenario, cara y Entorno", () => {
    const goblin = goblinGame();
    const loaded = deserializeGameState(serializeGameState(goblin));
    expect(loaded.scenarioId).toBe("risky-business");
    expect(loaded.villain.face).toBe("B");
    expect(loaded.environment).toEqual(goblin.environment);
  });
});

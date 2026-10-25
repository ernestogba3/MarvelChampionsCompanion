import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import { addThreatStep } from "../src/game/addThreat";
import { resolveVillainActivation } from "../src/game/villainActivation";
import {
  attackVillain,
  checkGameOutcome,
  thwartScheme,
} from "../src/game/playerActions";
import { revealPendingCardsForPlayer } from "../src/game/revealEncounterCards";
import { putCardIntoPlay } from "../src/game/putCardIntoPlay";
import { initPlayerLibrary } from "../src/game/playerLibrary";
import {
  addThreatToScheme,
  findVillain,
  ownSideScheme,
  setActiveVillain,
} from "../src/game/multiVillain";
import { getScenario } from "../src/scenarios";
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

function crew(players = P1, difficulty: "STANDARD" | "EXPERT" = "STANDARD") {
  return createGame("wrecking-crew", players, difficulty);
}

function withForm(state: GameState, form: PlayerForm): GameState {
  return { ...state, players: state.players.map((p) => ({ ...p, form })) };
}

function withOwnThreat(
  state: GameState,
  villainId: string,
  threat: number,
): GameState {
  return {
    ...state,
    schemes: state.schemes.map((s) =>
      s.villainId === villainId ? { ...s, threat } : s,
    ),
  };
}

function ownThreat(state: GameState, villainId: string): number | undefined {
  return ownSideScheme(state, villainId)?.threat;
}

function revealing(state: GameState, cardId: string): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === "player-1" ? { ...p, faceDownEncounterCards: [cardId] } : p,
    ),
  };
}

function makeDeck(size = 40): Record<string, number> {
  const cards: Record<string, number> = {};
  for (let i = 0; i < size; i++)
    cards[`card-${String(i).padStart(2, "0")}`] = 1;
  return cards;
}

describe("The Wrecking Crew — preparación", () => {
  it("1 jugador: cuatro villanos A, Destructor activo y cada uno con su plan y su mazo", () => {
    const state = crew();
    expect(state.scenarioId).toBe("wrecking-crew");
    expect(state.villain).toMatchObject({
      villainId: "wrecker",
      name: "Wrecker",
      cardId: "07002",
      stage: "A",
      health: 14,
      attack: 2,
      scheme: 2,
    });
    expect(state.reserveVillains!.map((r) => r.villain.villainId)).toEqual([
      "thunderball",
      "piledriver",
      "bulldozer",
    ]);
    expect(findVillain(state, "thunderball")?.health).toBe(13);
    expect(findVillain(state, "piledriver")).toMatchObject({
      health: 11,
      retaliate: 1,
    });
    expect(findVillain(state, "bulldozer")?.health).toBe(12);

    expect(state.schemes.find((s) => s.isMain)).toMatchObject({
      cardId: "07001b",
      threat: 0,
      threatToComplete: 6,
    });
    expect(ownThreat(state, "wrecker")).toBe(6);
    expect(ownThreat(state, "thunderball")).toBe(5);
    expect(ownThreat(state, "piledriver")).toBe(3);
    expect(ownThreat(state, "bulldozer")).toBe(4);

    expect(state.encounterDeck).toHaveLength(15);
    expect(state.encounterDeck[0]).toBe("07005");
    for (const r of state.reserveVillains!) {
      expect(r.encounterDeck).toHaveLength(15);
      expect(r.encounterDiscard).toEqual([]);
    }
  });

  it("2 jugadores: PG y umbral del plan principal ×2", () => {
    const state = crew(P2);
    expect(state.villain.health).toBe(28);
    expect(findVillain(state, "bulldozer")?.health).toBe(24);
    expect(state.schemes.find((s) => s.isMain)!.threatToComplete).toBe(12);
  });

  it("Experto: versiones B", () => {
    const state = crew(P1, "EXPERT");
    expect(state.villain).toMatchObject({ cardId: "07003", stage: "B", health: 18 });
    expect(findVillain(state, "piledriver")?.cardId).toBe("07033");
  });

  it("cada mazo se baraja por separado con el barajador de la app", () => {
    const reverse = (cards: readonly string[]) => [...cards].reverse();
    const state = createGame("wrecking-crew", P1, "STANDARD", {
      shuffle: reverse,
    });
    const villains = getScenario("wrecking-crew")!.villains!;
    expect(state.encounterDeck).toEqual([...villains[0]!.encounterDeck].reverse());
    expect(state.reserveVillains![2]!.encounterDeck).toEqual(
      [...villains[3]!.encounterDeck].reverse(),
    );
  });
});

describe("The Wrecking Crew — Fuga de prisión (paso 1)", () => {
  it("+1 fijo al plan principal y +1 a cada plan secundario", () => {
    const { state } = addThreatStep(crew(P2));
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(1);
    expect(ownThreat(state, "wrecker")).toBe(7);
    expect(ownThreat(state, "piledriver")).toBe(4);
  });

  it("el contador activo pasa al villano con más amenaza en su plan (con su mazo)", () => {
    const base = withOwnThreat(crew(), "bulldozer", 8);
    const { state, events } = addThreatStep(base);
    expect(state.villain.villainId).toBe("bulldozer");
    expect(state.encounterDeck[0]).toBe("07049");
    expect(
      state.reserveVillains!.find((r) => r.villain.villainId === "wrecker")!
        .encounterDeck[0],
    ).toBe("07005");
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "ACTIVE_VILLAIN_CHANGED",
        toVillainId: "bulldozer",
      }),
    );
  });

  it("en empate el contador se queda en el activo y avisa de los empatados", () => {
    const base = withOwnThreat(crew(), "thunderball", 6);
    const { state, events } = addThreatStep(base);
    expect(state.villain.villainId).toBe("wrecker");
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "ACTIVE_VILLAIN_CHANGED",
        toVillainId: "wrecker",
        tiedWith: ["thunderball"],
      }),
    );
  });

  it("un plan propio que llega a 10 dispara su efecto y baja a 3 antes de mover el contador", () => {
    // Poderoso como el trueno: aturde a cada personaje amigo.
    const base = withOwnThreat(crew(P2), "thunderball", 9);
    const { state } = addThreatStep(base);
    expect(ownThreat(state, "thunderball")).toBe(3);
    expect(state.players.every((p) => p.stunned)).toBe(true);
    expect(state.villain.villainId).toBe("wrecker");
  });
});

describe("The Wrecking Crew — activación del villano activo", () => {
  it("Destructor en forma de Héroe: ATQ 2 + aumento + 2 (ataque no defendido)", () => {
    const base = withForm(crew(), "HERO");
    const { state } = resolveVillainActivation(base, "player-1");
    // Aumento de Toma de rehenes (07005): 1.
    expect(state.players[0]!.health).toBe(5);
  });

  it("al maquinar pone la amenaza en su propio plan, no en el principal", () => {
    const { state, events } = resolveVillainActivation(crew(), "player-1");
    expect(ownThreat(state, "wrecker")).toBe(9);
    expect(state.schemes.find((s) => s.isMain)!.threat).toBe(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "VILLAIN_SCHEMED",
        schemeId: "side-day-of-reckoning",
        amount: 3,
      }),
    );
  });

  it("Ajuste de cuentas al llegar a 10: 2 de daño a cada jugador y baja a 3", () => {
    const base = withOwnThreat(crew(P2), "wrecker", 8);
    const { state } = resolveVillainActivation(base, "player-1");
    expect(ownThreat(state, "wrecker")).toBe(3);
    expect(state.players.map((p) => p.health)).toEqual([8, 13]);
  });

  it("Bola de Trueno activo: tras atacar inflige 1 de daño más", () => {
    const active = setActiveVillain(withForm(crew(), "HERO"), "thunderball").state;
    expect(active.encounterDeck[0]).toBe("07020");
    const { state } = resolveVillainActivation(active, "player-1");
    // ATQ 1 + aumento de Bola y cadena (3) + 1 de su Respuesta obligada.
    expect(state.players[0]!.health).toBe(5);
  });

  it("Despeja el camino al llegar a 10: cada jugador descarta 10 cartas de su mazo", () => {
    const withLibrary = initPlayerLibrary(crew(), "player-1", makeDeck(40)).state;
    const before = withLibrary.players[0]!.library!.length;
    const { state } = addThreatToScheme(
      withOwnThreat(withLibrary, "bulldozer", 9),
      "side-clear-the-road",
      1,
    );
    expect(state.players[0]!.library).toHaveLength(before - 10);
    expect(ownThreat(state, "bulldozer")).toBe(3);
  });

  it("Ejercer presión al llegar a 10 baja a 3 y avisa de que su efecto es guiado", () => {
    const { state, events } = addThreatToScheme(
      withOwnThreat(crew(), "piledriver", 9),
      "side-pile-it-on",
      1,
    );
    expect(ownThreat(state, "piledriver")).toBe(3);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "SIGNATURE_SCHEME_TRIGGERED", guided: true }),
    );
  });
});

describe("The Wrecking Crew — ataques de los jugadores", () => {
  it("se puede atacar a un villano que no es el activo; el contador no se mueve", () => {
    const { state } = attackVillain(crew(), "player-1", 5, "thunderball");
    expect(findVillain(state, "thunderball")?.health).toBe(8);
    expect(state.villain.villainId).toBe("wrecker");
    expect(state.villain.health).toBe(14);
  });

  it("Represalia 1 de Martinete", () => {
    const { state } = attackVillain(crew(), "player-1", 3, "piledriver");
    expect(state.players[0]!.health).toBe(9);
  });

  it("la Guardia impide atacar a cualquier villano", () => {
    const withGuard = putCardIntoPlay(crew(), "07008", "player-1").state;
    const { state, events } = attackVillain(withGuard, "player-1", 5, "bulldozer");
    expect(findVillain(state, "bulldozer")?.health).toBe(12);
    expect(events[0]).toMatchObject({ type: "ATTACK_BLOCKED_BY_GUARD" });
  });

  it("derrotar a un villano no activo lo retira con su plan; el activo sigue", () => {
    const { state, events } = attackVillain(crew(), "player-1", 13, "thunderball");
    expect(findVillain(state, "thunderball")).toBeUndefined();
    expect(ownSideScheme(state, "thunderball")).toBeUndefined();
    expect(state.villain.villainId).toBe("wrecker");
    expect(events).toContainEqual(
      expect.objectContaining({ type: "VILLAIN_DEFEATED", villainId: "thunderball" }),
    );
    expect(checkGameOutcome(state)).toBe("ONGOING");
  });

  it("derrotar al activo pasa el contador al villano con más amenaza en su plan", () => {
    const { state } = attackVillain(crew(), "player-1", 14);
    expect(findVillain(state, "wrecker")).toBeUndefined();
    // Bola de Trueno 5 > Bulldozer 4 > Martinete 3.
    expect(state.villain.villainId).toBe("thunderball");
    expect(state.encounterDeck[0]).toBe("07020");
    expect(state.reserveVillains).toHaveLength(2);
  });

  it("derrotar a los cuatro es la victoria", () => {
    let state = crew();
    state = attackVillain(state, "player-1", 13, "thunderball").state;
    state = attackVillain(state, "player-1", 11, "piledriver").state;
    state = attackVillain(state, "player-1", 12, "bulldozer").state;
    expect(checkGameOutcome(state)).toBe("ONGOING");
    state = attackVillain(state, "player-1", 14, "wrecker").state;
    expect(checkGameOutcome(state)).toBe("WIN");
  });

  it("los planes propios no salen de juego al quedarse sin amenaza", () => {
    const { state } = thwartScheme(crew(), "side-pile-it-on", 5);
    expect(ownThreat(state, "piledriver")).toBe(0);
  });

  it("completar Fuga de prisión es la derrota", () => {
    const base = crew();
    const lost: GameState = {
      ...base,
      schemes: base.schemes.map((s) => (s.isMain ? { ...s, threat: 6 } : s)),
    };
    expect(checkGameOutcome(lost)).toBe("LOSS");
  });
});

describe("The Wrecking Crew — cartas de encuentro", () => {
  it("la carta revelada va al descarte del mazo de su villano", () => {
    const { state } = revealPendingCardsForPlayer(
      revealing(crew(), "07027"),
      "player-1",
    );
    const thunderball = state.reserveVillains!.find(
      (r) => r.villain.villainId === "thunderball",
    )!;
    expect(thunderball.encounterDiscard).toEqual(["07027"]);
    expect(state.encounterDiscard).toEqual([]);
    // Proyectiles de energía: 1 de daño.
    expect(state.players[0]!.health).toBe(9);
  });

  it("¡Destrozadlos! (Héroe): te ataca el villano con menos amenaza en su plan", () => {
    const base = withForm(revealing(crew(), "07013"), "HERO");
    const { state, events } = revealPendingCardsForPlayer(base, "player-1");
    // Martinete (3): ATQ 2 + aumento del mazo activo (Toma de rehenes, 1).
    expect(events).toContainEqual({
      type: "VILLAIN_ATTACKED",
      playerId: "player-1",
      amount: 3,
    });
    expect(state.players[0]!.health).toBe(7);
  });

  it("¡Destrozadlos! (alter ego): maquina el villano con más amenaza en su plan", () => {
    const { state } = revealPendingCardsForPlayer(
      revealing(crew(), "07013"),
      "player-1",
    );
    // Destructor (6): PLA 2 + aumento 1 en su propio plan.
    expect(ownThreat(state, "wrecker")).toBe(9);
  });

  it("Lanzamiento de palanca: Destructor maquina y el contador pasa al de menos amenaza", () => {
    const { state } = revealPendingCardsForPlayer(
      revealing(crew(), "07012"),
      "player-1",
    );
    expect(ownThreat(state, "wrecker")).toBe(9);
    expect(state.villain.villainId).toBe("piledriver");
  });

  it("¡Lo estaba deseando!: el villano activo se cura 3 y queda Resistente", () => {
    const hurt = attackVillain(crew(), "player-1", 5).state;
    const { state } = revealPendingCardsForPlayer(
      revealing(hurt, "07014"),
      "player-1",
    );
    expect(state.villain).toMatchObject({ health: 12, tough: true });
  });

  it("Vínculo místico: 2 de amenaza en cada plan secundario", () => {
    const { state } = revealPendingCardsForPlayer(
      revealing(crew(), "07015"),
      "player-1",
    );
    expect(ownThreat(state, "wrecker")).toBe(8);
    expect(ownThreat(state, "piledriver")).toBe(5);
  });

  it("Descarga energética (Héroe): Bola de Trueno ataca y suma 3 a su plan", () => {
    const base = withForm(revealing(crew(), "07030"), "HERO");
    const { state } = revealPendingCardsForPlayer(base, "player-1");
    // ATQ 1 + aumento 1 + 1 de su Respuesta obligada.
    expect(state.players[0]!.health).toBe(7);
    expect(ownThreat(state, "thunderball")).toBe(8);
  });

  it("Destreza táctica: mueve la amenaza del plan con menos al de más y gana Oleada si no se dispara", () => {
    const { state, events } = revealPendingCardsForPlayer(
      revealing(crew(), "07031"),
      "player-1",
    );
    expect(ownThreat(state, "wrecker")).toBe(9);
    expect(ownThreat(state, "piledriver")).toBe(0);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "CARD_GAINED_SURGE" }),
    );
  });

  it("Destreza táctica sin Oleada si el plan de destino se dispara", () => {
    const base = revealing(withOwnThreat(crew(), "wrecker", 8), "07031");
    const { state, events } = revealPendingCardsForPlayer(base, "player-1");
    expect(ownThreat(state, "wrecker")).toBe(3);
    expect(events.some((e) => e.type === "CARD_GAINED_SURGE")).toBe(false);
  });

  it("Aporrear con Martinete Resistente: +2 al maquinar", () => {
    const base = revealing(crew(), "07044");
    const toughPiledriver: GameState = {
      ...base,
      reserveVillains: base.reserveVillains!.map((r) =>
        r.villain.villainId === "piledriver"
          ? { ...r, villain: { ...r.villain, tough: true } }
          : r,
      ),
    };
    const { state } = revealPendingCardsForPlayer(toughPiledriver, "player-1");
    // PLA 2 + aumento 1 + 2.
    expect(ownThreat(state, "piledriver")).toBe(8);
  });

  it("Acometida (alter ego): Bulldozer maquina y descartas 1 carta del mazo por amenaza", () => {
    const withLibrary = initPlayerLibrary(crew(), "player-1", makeDeck(40)).state;
    const before = withLibrary.players[0]!.library!.length;
    const { state } = revealPendingCardsForPlayer(
      revealing(withLibrary, "07055"),
      "player-1",
    );
    // PLA 1 + aumento 1 = 2 de amenaza → 2 cartas descartadas.
    expect(ownThreat(state, "bulldozer")).toBe(6);
    expect(state.players[0]!.library).toHaveLength(before - 2);
  });

  it("el Preso fugado lleva Oleada impresa", () => {
    const { events } = revealPendingCardsForPlayer(
      revealing(crew(), "07009"),
      "player-1",
    );
    expect(events).toContainEqual(
      expect.objectContaining({ type: "CARD_GAINED_SURGE" }),
    );
  });
});

describe("The Wrecking Crew — guardado", () => {
  it("serializar y cargar conserva los villanos en reserva", () => {
    const moved = setActiveVillain(crew(), "bulldozer").state;
    const loaded = deserializeGameState(serializeGameState(moved));
    expect(loaded.villain.villainId).toBe("bulldozer");
    expect(loaded.reserveVillains).toEqual(moved.reserveVillains);
  });
});

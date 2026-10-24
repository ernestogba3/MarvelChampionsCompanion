import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { advanceToNextStep } from "../src/game/advancePhase";
import {
  expandDeckCards,
  initPlayerLibrary,
  drawCards,
  drawToHandSize,
  playCardFromHand,
  discardCardFromHand,
  hasSimulatedLibrary,
  noShuffle,
  DEFAULT_HAND_SIZE,
} from "../src/game/playerLibrary";
import type { GameState, PlayerState } from "../src/domain/types";

// Baraja de prueba determinista: 40 cartas con códigos distintos en orden
// (card-00 … card-39). Con noShuffle (por defecto en el motor) el orden se
// conserva, así que podemos comprobar exactamente qué cartas van a la mano y
// cuáles a la biblioteca.
function makeDeck(size = 40): Record<string, number> {
  const cards: Record<string, number> = {};
  for (let i = 0; i < size; i++) {
    cards[`card-${String(i).padStart(2, "0")}`] = 1;
  }
  return cards;
}

// Sobrescribe la zona de biblioteca/mano/descarte de un jugador concreto, para
// montar escenarios precisos sin depender de barajado.
function withPlayerZones(
  state: GameState,
  playerId: string,
  zones: Partial<Pick<PlayerState, "library" | "hand" | "discardPile">>,
): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, ...zones } : p,
    ),
  };
}

describe("expandDeckCards", () => {
  it("expande { código: cantidad } a una lista plana en orden de inserción", () => {
    expect(expandDeckCards({ a: 2, b: 1, c: 3 })).toEqual([
      "a",
      "a",
      "b",
      "c",
      "c",
      "c",
    ]);
  });

  it("devuelve una lista vacía para un mazo vacío", () => {
    expect(expandDeckCards({})).toEqual([]);
  });
});

describe("initPlayerLibrary", () => {
  it("roba la mano inicial de la cima y deja el resto en la biblioteca", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const { state } = initPlayerLibrary(base, "player-1", makeDeck(40));

    const player = state.players[0]!;
    expect(player.hand).toHaveLength(DEFAULT_HAND_SIZE); // 6
    expect(player.library).toHaveLength(34);
    expect(player.discardPile).toEqual([]);
    // Con noShuffle, la mano son las 6 primeras y la biblioteca el resto.
    expect(player.hand).toEqual([
      "card-00",
      "card-01",
      "card-02",
      "card-03",
      "card-04",
      "card-05",
    ]);
    expect(player.library![0]).toBe("card-06");
  });

  it("respeta un tamaño de mano personalizado", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const { state } = initPlayerLibrary(base, "player-1", makeDeck(40), {
      handSize: 4,
    });
    expect(state.players[0]!.hand).toHaveLength(4);
    expect(state.players[0]!.library).toHaveLength(36);
  });

  it("emite LIBRARY_INITIALIZED con los tamaños correctos", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const { events } = initPlayerLibrary(base, "player-1", makeDeck(40));
    expect(events).toEqual([
      {
        type: "LIBRARY_INITIALIZED",
        playerId: "player-1",
        librarySize: 34,
        handSize: 6,
      },
    ]);
  });

  it("deja intacto el estado y sin eventos si el jugador no existe", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const { state, events } = initPlayerLibrary(
      base,
      "player-999",
      makeDeck(40),
    );
    expect(state).toBe(base);
    expect(events).toEqual([]);
  });

  it("marca al jugador como con biblioteca simulada", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    expect(hasSimulatedLibrary(base.players[0]!)).toBe(false);
    const { state } = initPlayerLibrary(base, "player-1", makeDeck(40));
    expect(hasSimulatedLibrary(state.players[0]!)).toBe(true);
  });
});

describe("drawCards", () => {
  it("roba N cartas de la cima de la biblioteca a la mano", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = withPlayerZones(base, "player-1", {
      library: ["x", "y", "z"],
      hand: [],
      discardPile: [],
    });
    const { state, events } = drawCards(seeded, "player-1", 2);
    expect(state.players[0]!.hand).toEqual(["x", "y"]);
    expect(state.players[0]!.library).toEqual(["z"]);
    expect(events).toContainEqual({
      type: "CARDS_DRAWN",
      playerId: "player-1",
      count: 2,
    });
  });

  it("baraja el descarte para formar nueva biblioteca cuando se agota", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = withPlayerZones(base, "player-1", {
      library: [],
      hand: [],
      discardPile: ["a", "b"],
    });
    const { state, events } = drawCards(seeded, "player-1", 1);
    // noShuffle: el descarte pasa tal cual a biblioteca; se roba la primera.
    expect(state.players[0]!.hand).toEqual(["a"]);
    expect(state.players[0]!.library).toEqual(["b"]);
    expect(state.players[0]!.discardPile).toEqual([]);
    expect(events[0]).toEqual({
      type: "LIBRARY_RESHUFFLED",
      playerId: "player-1",
    });
    expect(events).toContainEqual({
      type: "CARDS_DRAWN",
      playerId: "player-1",
      count: 1,
    });
  });

  it("deja de robar sin romper si biblioteca y descarte están vacíos", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = withPlayerZones(base, "player-1", {
      library: [],
      hand: [],
      discardPile: [],
    });
    const { state, events } = drawCards(seeded, "player-1", 3);
    expect(state).toBe(seeded);
    expect(events).toEqual([]);
  });

  it("no hace nada para un jugador sin biblioteca simulada", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const { state, events } = drawCards(base, "player-1", 1);
    expect(state).toBe(base);
    expect(events).toEqual([]);
  });
});

describe("drawToHandSize", () => {
  it("roba hasta completar la mano al tamaño objetivo", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = withPlayerZones(base, "player-1", {
      library: ["l0", "l1", "l2", "l3", "l4", "l5"],
      hand: ["h0", "h1", "h2"],
      discardPile: [],
    });
    const { state } = drawToHandSize(seeded, "player-1", { handSize: 6 });
    expect(state.players[0]!.hand).toHaveLength(6);
    expect(state.players[0]!.hand).toEqual([
      "h0",
      "h1",
      "h2",
      "l0",
      "l1",
      "l2",
    ]);
  });

  it("no roba nada si la mano ya está llena", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = withPlayerZones(base, "player-1", {
      library: ["l0", "l1"],
      hand: ["h0", "h1", "h2", "h3", "h4", "h5"],
      discardPile: [],
    });
    const { state, events } = drawToHandSize(seeded, "player-1", {
      handSize: 6,
    });
    expect(state).toBe(seeded);
    expect(events).toEqual([]);
  });
});

describe("playCardFromHand / discardCardFromHand", () => {
  it("jugar retira la carta de la mano y emite CARD_PLAYED", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = withPlayerZones(base, "player-1", {
      library: [],
      hand: ["a", "b", "c"],
      discardPile: [],
    });
    const { state, events } = playCardFromHand(seeded, "player-1", "b");
    expect(state.players[0]!.hand).toEqual(["a", "c"]);
    expect(events).toEqual([
      { type: "CARD_PLAYED", playerId: "player-1", cardCode: "b" },
    ]);
  });

  it("descartar mueve la carta al descarte y emite CARD_DISCARDED", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = withPlayerZones(base, "player-1", {
      library: [],
      hand: ["a", "b", "c"],
      discardPile: ["x"],
    });
    const { state, events } = discardCardFromHand(seeded, "player-1", "a");
    expect(state.players[0]!.hand).toEqual(["b", "c"]);
    expect(state.players[0]!.discardPile).toEqual(["x", "a"]);
    expect(events).toEqual([
      { type: "CARD_DISCARDED", playerId: "player-1", cardCode: "a" },
    ]);
  });

  it("no hace nada si la carta no está en la mano", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = withPlayerZones(base, "player-1", {
      library: [],
      hand: ["a"],
      discardPile: [],
    });
    expect(playCardFromHand(seeded, "player-1", "zzz").state).toBe(seeded);
    expect(discardCardFromHand(seeded, "player-1", "zzz").state).toBe(seeded);
  });
});

describe("robo automático al final de la fase de jugador (advanceToNextStep)", () => {
  it("rellena la mano hasta el tamaño objetivo al salir de la fase de jugador", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const seeded = initPlayerLibrary(base, "player-1", makeDeck(40)).state;
    // Simula que el jugador se quedó con 3 cartas en mano (jugó 3).
    const withSmallHand = withPlayerZones(seeded, "player-1", {
      hand: seeded.players[0]!.hand!.slice(0, 3),
    });
    expect(withSmallHand.phase).toEqual({ name: "PLAYER_PHASE" });

    const after = advanceToNextStep(withSmallHand);
    expect(after.phase).toEqual({ name: "VILLAIN_PHASE", step: "ADD_THREAT" });
    expect(after.players[0]!.hand).toHaveLength(6);
  });

  it("no afecta a jugadores sin biblioteca simulada (sin regresión)", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    expect(base.players[0]!.hand).toBeUndefined();
    const after = advanceToNextStep(base);
    // El jugador sin biblioteca no roba: su mano sigue sin definir.
    expect(after.players[0]!.hand).toBeUndefined();
  });
});

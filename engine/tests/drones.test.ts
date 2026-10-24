import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import { initPlayerLibrary } from "../src/game/playerLibrary";
import { createDrone, droneCount } from "../src/game/drones";
import { attackVillain, attackMinion } from "../src/game/playerActions";
import { advanceVillainStage } from "../src/game/villainStages";
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

function makeDeck(size = 40): Record<string, number> {
  const cards: Record<string, number> = {};
  for (let i = 0; i < size; i++)
    cards[`card-${String(i).padStart(2, "0")}`] = 1;
  return cards;
}

// Partida de Ultron (estándar) con la biblioteca del jugador inicializada.
function ultronWithLibrary(): GameState {
  const base = createGame("ultron", P1, "STANDARD");
  return initPlayerLibrary(base, "player-1", makeDeck(40)).state;
}

describe("createDrone", () => {
  it("crea un Dron desde la cima de la biblioteca, enfrentado al jugador", () => {
    const state = ultronWithLibrary();
    const topBefore = state.players[0]!.library![0]; // "card-06" (tras mano de 6)
    const { state: next, events } = createDrone(state, "player-1");

    expect(next.minions).toHaveLength(1);
    const drone = next.minions[0]!;
    expect(drone.isDrone).toBe(true);
    expect(drone.engagedWith).toBe("player-1");
    expect(drone.attack).toBe(1); // base, sin bonus (estadio I)
    expect(drone.health).toBe(1);
    expect(drone.scheme).toBe(1);
    expect(drone.faceDownCardCode).toBe(topBefore);
    // La carta salió de la biblioteca.
    expect(next.players[0]!.library).not.toContain(topBefore);
    expect(events[0]).toMatchObject({
      type: "DRONE_CREATED",
      playerId: "player-1",
    });
  });

  it("no crea Dron si el jugador no tiene biblioteca simulada", () => {
    const base = createGame("ultron", P1, "STANDARD"); // sin initPlayerLibrary
    const { state, events } = createDrone(base, "player-1");
    expect(state).toBe(base);
    expect(events).toEqual([]);
  });

  it("baraja el descarte si la biblioteca está vacía", () => {
    const base = createGame("ultron", P1, "STANDARD");
    const seeded: GameState = {
      ...base,
      players: base.players.map((p) =>
        p.id === "player-1"
          ? { ...p, library: [], hand: [], discardPile: ["x", "y"] }
          : p,
      ),
    };
    const { state, events } = createDrone(seeded, "player-1");
    expect(state.minions).toHaveLength(1);
    expect(state.minions[0]!.faceDownCardCode).toBe("x"); // noShuffle: primera del descarte
    expect(events[0]!.type).toBe("DRONE_CREATED");
  });
});

describe("Dron derrotado vuelve al descarte del dueño", () => {
  it("al derrotar un Dron, su carta boca abajo va al descarte del jugador", () => {
    const state = ultronWithLibrary();
    const withDrone = createDrone(state, "player-1").state;
    const drone = withDrone.minions[0]!;
    const card = drone.faceDownCardCode!;

    const { state: next, events } = attackMinion(
      withDrone,
      drone.id,
      1,
      "player-1",
    );
    expect(next.minions).toHaveLength(0); // dron derrotado (1 PG)
    expect(next.players[0]!.discardPile).toContain(card);
    expect(events).toContainEqual({
      type: "DRONE_RETURNED",
      playerId: "player-1",
      cardCode: card,
    });
  });
});

describe("Ultron III: inmunidad y escalado de Drones", () => {
  it("Ultron III escala los Drones existentes +1/+1 al avanzar de estadio", () => {
    // Experto: empieza en II; al derrotar II avanza a III (droneBonus 1).
    const base = createGame("ultron", P1, "EXPERT");
    const withLib = initPlayerLibrary(base, "player-1", makeDeck(40)).state;
    const withDrone = createDrone(withLib, "player-1").state;
    expect(withDrone.minions[0]!.attack).toBe(1); // II: sin bonus

    const atIII = advanceVillainStage(withDrone).state;
    expect(atIII.villain.stage).toBe("III");
    expect(atIII.villain.droneBonus).toBe(1);
    expect(atIII.villain.immuneWhileDronesPresent).toBe(true);
    // El dron que ya existía se escaló.
    expect(atIII.minions[0]!.attack).toBe(2);
    expect(atIII.minions[0]!.health).toBe(2);
    expect(atIII.minions[0]!.maxHealth).toBe(2);
  });

  it("Drones creados en Ultron III nacen con +1/+1", () => {
    const base = createGame("ultron", P1, "EXPERT");
    const withLib = initPlayerLibrary(base, "player-1", makeDeck(40)).state;
    const atIII = advanceVillainStage(withLib).state; // II -> III
    const withDrone = createDrone(atIII, "player-1").state;
    const drone = withDrone.minions[0]!;
    expect(drone.attack).toBe(2);
    expect(drone.health).toBe(2);
  });

  it("Ultron III no puede sufrir daño mientras haya un Dron en juego", () => {
    const base = createGame("ultron", P1, "EXPERT");
    const withLib = initPlayerLibrary(base, "player-1", makeDeck(40)).state;
    const atIII = advanceVillainStage(withLib).state;
    const withDrone = createDrone(atIII, "player-1").state;
    const hpBefore = withDrone.villain.health;

    const { state: next, events } = attackVillain(withDrone, "player-1", 5);
    expect(next.villain.health).toBe(hpBefore); // sin daño
    expect(events).toContainEqual({
      type: "ATTACK_BLOCKED_BY_DRONES",
      villainName: "Ultron",
    });
  });

  it("sin Drones en juego, Ultron III sí recibe daño", () => {
    const base = createGame("ultron", P1, "EXPERT");
    const atIII = advanceVillainStage(base).state; // II -> III, sin drones
    expect(droneCount(atIII)).toBe(0);
    const { state: next } = attackVillain(atIII, "player-1", 5);
    expect(next.villain.health).toBe(atIII.villain.health - 5);
  });
});

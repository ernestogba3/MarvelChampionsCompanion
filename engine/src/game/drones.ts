import type { GameState, MinionState, PlayerState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { noShuffle, type Shuffle } from "./playerLibrary";

// Estadísticas base de un Dron (carta de Entorno "Drones de Ultrón", 01140):
// ATQ 1 / Plan 1 / PG 1. El bonus del estadio (Ultron III = +1/+1) se aplica a
// ATQ y PG; el Plan no escala.
export const DRONE_BASE_ATTACK = 1;
export const DRONE_BASE_SCHEME = 1;
export const DRONE_BASE_HEALTH = 1;

/**
 * Saca la carta superior de la biblioteca del jugador. Si está vacía y hay
 * descarte, lo baraja para formar nueva biblioteca (igual que robar). Devuelve
 * la carta (o null si no hay ninguna) y las zonas actualizadas.
 */
function takeTopOfLibrary(
  player: PlayerState,
  shuffle: Shuffle,
): { card: string | null; library: string[]; discardPile: string[] } {
  let library = [...(player.library ?? [])];
  let discardPile = [...(player.discardPile ?? [])];
  if (library.length === 0) {
    if (discardPile.length === 0) {
      return { card: null, library, discardPile };
    }
    library = shuffle(discardPile);
    discardPile = [];
  }
  const card = library.shift() ?? null;
  return { card, library, discardPile };
}

/** Id único de dron para un jugador, sin colisionar con los drones vivos. */
function nextDroneId(state: GameState, playerId: string): string {
  const prefix = `drone-${playerId}-`;
  let max = 0;
  for (const m of state.minions) {
    if (m.id.startsWith(prefix)) {
      const n = parseInt(m.id.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

/**
 * Crea un Esbirro Dron para un jugador: pone boca abajo la carta superior de
 * su biblioteca y la mete en juego como Dron enfrentado a él, con las stats
 * base + el bonus del villano (villain.droneBonus; Ultron III = +1/+1 a ATQ y
 * PG). La carta queda oculta en faceDownCardCode para devolverla al descarte
 * del dueño al derrotar al dron.
 *
 * Si el jugador no tiene biblioteca simulada, o no le queda ninguna carta
 * (biblioteca y descarte vacíos), no se crea dron y el estado queda intacto.
 *
 * El motor NO baraja por su cuenta (determinista para tests); la app pasa un
 * barajador real por si hay que rebarajar el descarte.
 */
export function createDrone(
  state: GameState,
  playerId: string,
  options: { shuffle?: Shuffle } = {},
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.library === undefined) {
    return { state, events: [] };
  }
  const shuffle = options.shuffle ?? noShuffle;
  const { card, library, discardPile } = takeTopOfLibrary(player, shuffle);
  if (card === null) {
    return { state, events: [] };
  }

  const bonus = state.villain.droneBonus ?? 0;
  const id = nextDroneId(state, playerId);
  const drone: MinionState = {
    id,
    cardId: "",
    name: "Dron",
    attack: DRONE_BASE_ATTACK + bonus,
    scheme: DRONE_BASE_SCHEME,
    health: DRONE_BASE_HEALTH + bonus,
    maxHealth: DRONE_BASE_HEALTH + bonus,
    engagedWith: playerId,
    tough: false,
    guard: false,
    isDrone: true,
    faceDownCardCode: card,
  };

  return {
    state: {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, library, discardPile } : p,
      ),
      minions: [...state.minions, drone],
    },
    events: [{ type: "DRONE_CREATED", playerId, minionId: id, cardCode: card }],
  };
}

/** Número de Drones en juego (de cualquier jugador). */
export function droneCount(state: GameState): number {
  return state.minions.filter((m) => m.isDrone).length;
}

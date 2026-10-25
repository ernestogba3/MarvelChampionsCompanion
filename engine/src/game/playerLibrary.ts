import type { GameState, PlayerState } from "../domain/types";
import type { GameEvent } from "../events/types";

/**
 * Tamaño de mano objetivo al final de la fase del jugador. En Marvel
 * Champions cada héroe tiene su propio límite impreso (p.ej. Spider-Man roba
 * hasta 6, She-Hulk hasta 6, etc.) pero la inmensa mayoría del Core Set usan
 * 6, así que lo tomamos como valor por defecto. Cuando el motor modele más
 * héroes, esto pasará a leerse de la carta de identidad.
 */
export const DEFAULT_HAND_SIZE = 6;

/**
 * Función de barajado inyectable. El motor NO baraja por su cuenta con
 * Math.random — igual que el mazo de encuentros, el orden real se decide
 * fuera para que los tests sean deterministas. La app pasa un barajador real
 * (Fisher-Yates); los tests pasan uno identidad o uno sembrado.
 */
export type Shuffle = (cards: readonly string[]) => string[];

/** Barajado identidad: deja el orden tal cual. Es el valor por defecto. */
export const noShuffle: Shuffle = (cards) => [...cards];

/**
 * Expande un DeckDefinition.cards ({ código: cantidad }) a una lista plana de
 * IDs de carta (una entrada por copia). El orden de entrada es estable
 * (orden de inserción de las claves); barajar es responsabilidad del
 * `shuffle` que se pase a initPlayerLibrary.
 */
export function expandDeckCards(cards: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [code, qty] of Object.entries(cards)) {
    for (let i = 0; i < qty; i++) {
      out.push(code);
    }
  }
  return out;
}

/**
 * Inicializa la biblioteca de UN jugador: expande las cartas del mazo, las
 * baraja con el `shuffle` dado, roba la mano inicial (handSize) de la cima y
 * deja el resto en la biblioteca. La pila de descarte empieza vacía.
 *
 * Devuelve { state, events } como el resto de acciones del motor, para poder
 * encadenarse con runAndLog si se quiere registrar el barajado/robo.
 *
 * Si el playerId no existe, devuelve el estado intacto sin eventos.
 */
export function initPlayerLibrary(
  state: GameState,
  playerId: string,
  deckCards: Record<string, number>,
  options: { shuffle?: Shuffle; handSize?: number } = {},
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return { state, events: [] };
  }

  const shuffle = options.shuffle ?? noShuffle;
  const handSize = options.handSize ?? DEFAULT_HAND_SIZE;

  const shuffled = shuffle(expandDeckCards(deckCards));
  // La mano inicial sale de la cima (índice 0). Si el mazo tuviera menos
  // cartas que handSize (no debería con un mazo legal de 40+), robamos lo que
  // haya y la biblioteca queda vacía.
  const hand = shuffled.slice(0, handSize);
  const library = shuffled.slice(handSize);

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId
      ? { ...p, library, hand, discardPile: [] as string[] }
      : p,
  );

  return {
    state: { ...state, players: updatedPlayers },
    events: [
      {
        type: "LIBRARY_INITIALIZED",
        playerId,
        librarySize: library.length,
        handSize: hand.length,
      },
    ],
  };
}

/**
 * Roba N cartas de la cima de la biblioteca de un jugador a su mano. Si la
 * biblioteca se agota antes de robar N, se baraja la pila de descarte para
 * formar una nueva biblioteca (regla oficial: cuando te quedas sin cartas en
 * la biblioteca, barajas tu descarte y lo conviertes en la nueva biblioteca)
 * y se continúa robando. Si descarte Y biblioteca están vacíos, se deja de
 * robar (no hay penalización de derrota por quedarte sin cartas, a diferencia
 * del villano).
 *
 * Usa el `shuffle` dado para rebarajar el descarte. Jugador sin biblioteca
 * inicializada (library === undefined) → estado intacto, sin eventos.
 */
export function drawCards(
  state: GameState,
  playerId: string,
  count: number,
  options: { shuffle?: Shuffle } = {},
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.library === undefined) {
    return { state, events: [] };
  }

  const shuffle = options.shuffle ?? noShuffle;

  let library = [...player.library];
  let discardPile = [...(player.discardPile ?? [])];
  const hand = [...(player.hand ?? [])];
  const events: GameEvent[] = [];
  let drawn = 0;

  for (let i = 0; i < count; i++) {
    if (library.length === 0) {
      if (discardPile.length === 0) {
        break; // sin cartas en ningún sitio: no se puede robar más
      }
      library = shuffle(discardPile);
      discardPile = [];
      events.push({ type: "LIBRARY_RESHUFFLED", playerId });
    }
    const top = library.shift();
    if (top === undefined) break;
    hand.push(top);
    drawn++;
  }

  if (drawn === 0 && events.length === 0) {
    return { state, events: [] };
  }

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, library, hand, discardPile } : p,
  );

  return {
    state: { ...state, players: updatedPlayers },
    events: [...events, { type: "CARDS_DRAWN", playerId, count: drawn }],
  };
}

/**
 * Roba hasta completar la mano al tamaño objetivo (handSize). Es el robo del
 * final de la fase del jugador. Si ya tiene handSize o más cartas en mano, no
 * roba nada. Jugadores sin biblioteca se ignoran (no es error).
 */
export function drawToHandSize(
  state: GameState,
  playerId: string,
  options: { shuffle?: Shuffle; handSize?: number } = {},
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.library === undefined) {
    return { state, events: [] };
  }
  const handSize = options.handSize ?? DEFAULT_HAND_SIZE;
  const current = player.hand?.length ?? 0;
  const toDraw = handSize - current;
  if (toDraw <= 0) {
    return { state, events: [] };
  }
  const drawOptions =
    options.shuffle !== undefined ? { shuffle: options.shuffle } : {};
  return drawCards(state, playerId, toDraw, drawOptions);
}

/**
 * Juega una carta de la mano: la quita de la mano. NO la pone en el descarte
 * automáticamente — en Marvel Champions los aliados y mejoras permanecen en
 * juego, los eventos van al descarte. El motor todavía no modela zonas de
 * juego de cartas de jugador, así que esta función solo retira la carta de la
 * mano y emite el evento; la app decide qué hacer con ella visualmente.
 *
 * Carta no presente en la mano → estado intacto, sin eventos.
 */
export function playCardFromHand(
  state: GameState,
  playerId: string,
  cardCode: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.hand === undefined) {
    return { state, events: [] };
  }
  const idx = player.hand.indexOf(cardCode);
  if (idx === -1) {
    return { state, events: [] };
  }
  const hand = [...player.hand];
  hand.splice(idx, 1);

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, hand } : p,
  );

  return {
    state: { ...state, players: updatedPlayers },
    events: [{ type: "CARD_PLAYED", playerId, cardCode }],
  };
}

/**
 * Descarta una carta concreta de la mano a la pila de descarte. Para eventos
 * jugados o descartes forzados. Carta no presente → estado intacto.
 */
export function discardCardFromHand(
  state: GameState,
  playerId: string,
  cardCode: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.hand === undefined) {
    return { state, events: [] };
  }
  const idx = player.hand.indexOf(cardCode);
  if (idx === -1) {
    return { state, events: [] };
  }
  const hand = [...player.hand];
  hand.splice(idx, 1);
  const discardPile = [...(player.discardPile ?? []), cardCode];

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, hand, discardPile } : p,
  );

  return {
    state: { ...state, players: updatedPlayers },
    events: [{ type: "CARD_DISCARDED", playerId, cardCode }],
  };
}

/**
 * Descarta N cartas de la cima de la biblioteca a la pila de descarte (p.ej.
 * "descarta 1 carta del mazo de cada jugador" de OPA hostil). Si la biblioteca
 * tiene menos de N, descarta las que haya: el motor no rebaraja aquí ni aplica
 * la penalización de mazo agotado (se resuelve a mano). Sin biblioteca
 * simulada o N ≤ 0 → estado intacto.
 */
export function millPlayerDeck(
  state: GameState,
  playerId: string,
  count: number,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.library === undefined || count <= 0) {
    return { state, events: [] };
  }
  const milled = player.library.slice(0, count);
  if (milled.length === 0) {
    return { state, events: [] };
  }
  const library = player.library.slice(milled.length);
  const discardPile = [...(player.discardPile ?? []), ...milled];

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, library, discardPile } : p,
  );

  return {
    state: { ...state, players: updatedPlayers },
    events: [{ type: "PLAYER_DECK_MILLED", playerId, count: milled.length }],
  };
}

/**
 * Devuelve true si el jugador tiene biblioteca simulada (se inicializó con un
 * mazo). La app lo usa para decidir si muestra el panel de mano/biblioteca o
 * no para ese jugador.
 */
export function hasSimulatedLibrary(player: PlayerState): boolean {
  return player.library !== undefined;
}

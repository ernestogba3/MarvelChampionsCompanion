import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { getScenarioForState } from "../scenarios";

/**
 * Un paso del generador pseudoaleatorio (mulberry32): devuelve un número en
 * [0, 1) y la semilla siguiente. Mismo resultado para la misma semilla.
 */
function nextRandom(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/**
 * Fisher-Yates sembrado: baraja `cards` con `seed` y devuelve también la
 * semilla resultante, para encadenar barajados sin repetir el orden.
 */
export function seededShuffle(
  cards: readonly string[],
  seed: number,
): { cards: string[]; seed: number } {
  const copy = [...cards];
  let current = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    const r = nextRandom(current);
    current = r.seed;
    const j = Math.floor(r.value * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return { cards: copy, seed: current };
}

/**
 * Baraja cartas de encuentro con la semilla de la partida y la avanza. Sin
 * semilla (tests, partidas guardadas antiguas) deja el orden tal cual: el
 * motor no usa Math.random.
 */
export function shuffleEncounterCards(
  state: GameState,
  cards: readonly string[],
): { state: GameState; cards: string[] } {
  if (state.encounterShuffleSeed === undefined) {
    return { state, cards: [...cards] };
  }
  const shuffled = seededShuffle(cards, state.encounterShuffleSeed);
  return {
    state: { ...state, encounterShuffleSeed: shuffled.seed },
    cards: shuffled.cards,
  };
}

/**
 * Saca la carta superior del mazo de encuentro. Si está vacío y hay cartas
 * en el descarte, baraja el descarte para formar un mazo nuevo y añade un
 * token de aceleración permanente al plan principal (penalización oficial
 * del Rules Reference por agotar el mazo). Si no queda ninguna carta en
 * ningún sitio, devuelve cardId: null.
 *
 * Compartida por dealPendingEncounterCards (reparto a jugadores) y
 * resolveVillainActivation (carta de impulso del villano).
 */
export function drawFromEncounterDeck(state: GameState): {
  state: GameState;
  cardId: string | null;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  let current = state;
  let deck = [...state.encounterDeck];
  let discard = [...state.encounterDiscard];
  let schemes = state.schemes;

  if (deck.length === 0 && discard.length > 0) {
    const shuffled = shuffleEncounterCards(current, discard);
    current = shuffled.state;
    deck = shuffled.cards;
    discard = [];

    const mainScheme = schemes.find((s) => s.isMain);
    if (mainScheme) {
      schemes = schemes.map((s) =>
        s.id === mainScheme.id
          ? { ...s, accelerationTokens: s.accelerationTokens + 1 }
          : s,
      );
      events.push({
        type: "ENCOUNTER_DECK_RESHUFFLED",
        schemeId: mainScheme.id,
      });
    }
  }

  const cardId = deck.shift() ?? null;

  return {
    state: {
      ...current,
      encounterDeck: deck,
      encounterDiscard: discard,
      schemes,
    },
    cardId,
    events,
  };
}

/**
 * Saca una copia de `cardId` del mazo de encuentros o, si no queda ahí, de su
 * descarte ("busca en el mazo de encuentros y en la pila de descartes").
 * found: false si no hay ninguna copia (estado intacto).
 */
export function takeEncounterCard(
  state: GameState,
  cardId: string,
): { state: GameState; found: boolean } {
  const deckIdx = state.encounterDeck.indexOf(cardId);
  if (deckIdx >= 0) {
    const encounterDeck = [...state.encounterDeck];
    encounterDeck.splice(deckIdx, 1);
    return { state: { ...state, encounterDeck }, found: true };
  }
  const discardIdx = state.encounterDiscard.indexOf(cardId);
  if (discardIdx >= 0) {
    const encounterDiscard = [...state.encounterDiscard];
    encounterDiscard.splice(discardIdx, 1);
    return { state: { ...state, encounterDiscard }, found: true };
  }
  return { state, found: false };
}

/**
 * Pone una carta de encuentro que sale de juego (o que se resuelve sin
 * quedarse en juego) en el descarte del mazo de su villano ("cuando una carta
 * de encuentro sale de juego, va al descarte de su mazo"). Con varios
 * villanos (The Wrecking Crew), si su villano ya fue derrotado su mazo no
 * existe y la carta sale de la partida. En los escenarios de un solo villano,
 * al descarte de siempre. Sin código de carta (Drones, partidas antiguas) →
 * estado intacto.
 */
export function discardEncounterCard(
  state: GameState,
  cardId: string,
): GameState {
  if (cardId === "") return state;
  const villains = getScenarioForState(state)?.villains;
  const owner =
    state.reserveVillains !== undefined && villains !== undefined
      ? villains.find((v) => v.encounterDeck.includes(cardId))
      : undefined;
  if (owner === undefined || owner.id === state.villain.villainId) {
    return { ...state, encounterDiscard: [...state.encounterDiscard, cardId] };
  }
  return {
    ...state,
    reserveVillains: (state.reserveVillains ?? []).map((r) =>
      r.villain.villainId === owner.id
        ? { ...r, encounterDiscard: [...r.encounterDiscard, cardId] }
        : r,
    ),
  };
}

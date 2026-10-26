// Sets modulares de encuentro. Un set modular es un grupo de cartas con nombre
// (esbirros, planes secundarios, acopladas, tratados, a veces entorno) que se
// AÑADE al mazo de encuentros de un escenario, además del set propio del
// villano y del set Estándar. No es un escenario por sí mismo.
//
// Muchos packs son en realidad sets modulares (Ronan = Fanático Kree) y las
// cajas de campaña traen varios. El jugador elige cuáles entran al crear la
// partida; createGame mezcla sus cartas en el mazo de encuentros.
//
// Cada set lista sus cartas por código (con repeticiones para las cantidades),
// igual que un `encounterDeck` de escenario. Las cartas deben existir en
// CARD_CATALOG (ver data/cards.ts).

export interface ModularSet {
  /** Clave estable (card_set_code de marvelcdb), p. ej. "kree_fanatic". */
  id: string;
  /** Nombre en español para la UI. */
  name: string;
  /** Códigos de carta, una entrada por copia. */
  cards: string[];
}

const KREE_FANATIC: ModularSet = {
  id: "kree_fanatic",
  name: "Fanático Kree",
  // 90001 Ronan el Acusador ×1, 90002 Juez, jurado y verdugo ×1, 90003 El
  // acusado ×1, 90004 Dictar sentencia ×2, 90005 ¿Te atreves a oponerte a
  // mí? ×2 (cantidades de marvelcdb).
  cards: ["90001", "90002", "90003", "90004", "90004", "90005", "90005"],
};

const MODULAR_SET_LIST: ModularSet[] = [KREE_FANATIC];

export const MODULAR_SETS: Record<string, ModularSet> = Object.fromEntries(
  MODULAR_SET_LIST.map((s) => [s.id, s]),
);

/** Todos los sets modulares disponibles, en orden de registro. */
export const ALL_MODULAR_SETS: ModularSet[] = MODULAR_SET_LIST;

export function getModularSet(id: string): ModularSet | undefined {
  return MODULAR_SETS[id];
}

/** Cartas de los sets modulares indicados, en orden; ids desconocidos se ignoran. */
export function modularSetCards(ids: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const set = MODULAR_SETS[id];
    if (set !== undefined) out.push(...set.cards);
  }
  return out;
}

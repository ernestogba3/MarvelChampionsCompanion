// "Mazo del pack": mazo inicial de un héroe construido solo con datos de
// marvelcdb, para que cualquier héroe tenga mazo sin crearlo a mano.
//
// marvelcdb no publica los mazos preconstruidos oficiales (están en el
// folleto de cada pack y a veces usan cartas del Core Set), así que esto NO
// es el preconstruido impreso. Es:
//   - las cartas específicas del héroe (las de su card_set_code en su pack,
//     incluidas las de color de aspecto como las de Spider-Woman), exactas;
//   - las cartas de UN aspecto que vienen en su pack;
//   - las cartas básicas que vienen en su pack.
// Las de aspecto y básicas con card_set_code son de otro héroe o de un
// escenario (p.ej. los "líderes" de Civil War) y no entran.
//
// El tamaño puede quedar fuera de 40-50 en el Core Set y en las cajas con
// dos héroes (el pack trae cartas para los dos): no se recorta, porque
// elegir qué cartas quitar sería inventarse el mazo. El jugador puede
// editarlo en Colección.
//
// Función pura: el catálogo se pasa como argumento.

import {
  ASPECT_FACTIONS,
  BASIC_FACTION,
  type AspectFaction,
  type DeckDefinition,
} from "./deckRules";

/** Datos de marvelcdb que hacen falta para montar el mazo del pack. */
export interface PackCardInfo {
  /** Código de marvelcdb, p. ej. "03004". */
  code: string;
  /** pack_code de marvelcdb, p. ej. "cap". */
  packCode: string;
  /** type_code de marvelcdb ("hero", "alter_ego", "event"…). */
  typeCode: string;
  /** faction_code de marvelcdb. */
  factionCode: string;
  /** card_set_code de marvelcdb, o null. */
  setCode: string | null;
  /** Copias que trae el pack. */
  quantity: number;
  /** deck_limit de marvelcdb. 0 significa "sin límite conocido". */
  deckLimit: number;
}

const IDENTITY_TYPES = new Set(["hero", "alter_ego"]);
const NON_PLAYER_FACTIONS = new Set(["encounter", "campaign"]);

const isAspect = (f: string): f is AspectFaction =>
  (ASPECT_FACTIONS as readonly string[]).includes(f);

function copies(card: PackCardInfo): number {
  return card.deckLimit > 0
    ? Math.min(card.quantity, card.deckLimit)
    : card.quantity;
}

function heroCard(
  heroCode: string,
  cards: readonly PackCardInfo[],
): PackCardInfo | undefined {
  return cards.find((c) => c.code === heroCode && c.typeCode === "hero");
}

/** Carta de aspecto o básica "genérica" del pack del héroe (sin set). */
function isPackPlayerCard(card: PackCardInfo, packCode: string): boolean {
  return card.packCode === packCode && card.setCode === null;
}

/**
 * Aspectos con cartas en el pack del héroe, de más a menos copias (en
 * empate, en el orden de ASPECT_FACTIONS). El primero es el aspecto por
 * defecto del mazo del pack. Héroe desconocido → lista vacía.
 */
export function packAspects(
  heroCode: string,
  cards: readonly PackCardInfo[],
): { aspect: AspectFaction; copies: number }[] {
  const hero = heroCard(heroCode, cards);
  if (hero === undefined) return [];
  const totals = new Map<AspectFaction, number>();
  for (const card of cards) {
    if (!isPackPlayerCard(card, hero.packCode) || !isAspect(card.factionCode)) {
      continue;
    }
    totals.set(
      card.factionCode,
      (totals.get(card.factionCode) ?? 0) + copies(card),
    );
  }
  return ASPECT_FACTIONS.filter((a) => totals.has(a))
    .map((aspect) => ({ aspect, copies: totals.get(aspect) ?? 0 }))
    .sort((a, b) => b.copies - a.copies);
}

/**
 * Monta el mazo del pack de un héroe con el aspecto indicado o, si no se
 * indica, con el que más copias trae su pack (null = solo básicas).
 * Héroe desconocido → null.
 */
export function buildPackDeck(
  heroCode: string,
  cards: readonly PackCardInfo[],
  aspect?: AspectFaction | null,
): DeckDefinition | null {
  const hero = heroCard(heroCode, cards);
  if (hero === undefined || hero.setCode === null) return null;
  const heroSetCode = hero.setCode;
  const chosen =
    aspect !== undefined
      ? aspect
      : (packAspects(heroCode, cards)[0]?.aspect ?? null);

  const deckCards: Record<string, number> = {};
  const add = (card: PackCardInfo) => {
    const n = copies(card);
    if (n > 0) deckCards[card.code] = (deckCards[card.code] ?? 0) + n;
  };
  for (const card of cards) {
    if (IDENTITY_TYPES.has(card.typeCode)) continue;
    if (NON_PLAYER_FACTIONS.has(card.factionCode)) continue;
    if (card.packCode !== hero.packCode) continue;
    if (card.setCode === heroSetCode) {
      // Solo las de su propio pack: una reimpresión en otro pack son las
      // mismas cartas con otro código.
      add(card);
    } else if (
      isPackPlayerCard(card, hero.packCode) &&
      (card.factionCode === BASIC_FACTION || card.factionCode === chosen)
    ) {
      add(card);
    }
  }

  return {
    id: `pack-${heroCode}-${chosen ?? "basic"}`,
    name: "Mazo del pack",
    heroCode,
    heroSetCode,
    aspect: chosen,
    cards: deckCards,
  };
}

/** Número de cartas del mazo (sin la identidad). */
export function deckSize(deck: DeckDefinition): number {
  return Object.values(deck.cards).reduce((sum, n) => sum + n, 0);
}

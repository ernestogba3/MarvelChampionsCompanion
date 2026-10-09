// Validación de mazos de jugador según las reglas de construcción de
// Marvel Champions: 40-50 cartas, todas las cartas específicas del héroe,
// como máximo un aspecto, y límite de copias por título.
//
// Función pura: no toca red ni almacenamiento. El índice de cartas (catálogo)
// y la colección (cantidades que posee el jugador) se pasan como argumentos.
//
// Códigos de facción verificados contra la API pública de marvelcdb:
//   aggression, justice, leadership, protection → cartas de aspecto
//   basic → cartas básicas (válidas en cualquier mazo)
//   hero  → carta de identidad y cartas específicas de cada héroe
//           (las específicas comparten card_set_code con el héroe)

export const ASPECT_FACTIONS = [
  "aggression",
  "justice",
  "leadership",
  "protection",
] as const;
export type AspectFaction = (typeof ASPECT_FACTIONS)[number];

export const BASIC_FACTION = "basic";
export const HERO_FACTION = "hero";
export const DECK_MIN_CARDS = 40;
export const DECK_MAX_CARDS = 50;

/** Información mínima de una carta necesaria para validar un mazo. */
export interface DeckCardInfo {
  /** Código de marvelcdb, p. ej. "01001a". */
  code: string;
  /** Nombre en español. Es la clave de agrupación para el límite de copias. */
  title: string;
  /** faction_code de marvelcdb. */
  factionCode: string;
  /** card_set_code de marvelcdb (p. ej. "spider_man"). null si no es de héroe. */
  heroSetCode: string | null;
  /** deck_limit de marvelcdb. 0 significa "sin límite conocido". */
  deckLimit: number;
  /** true para la carta de identidad y el alter ego (no van en el mazo). */
  isIdentity: boolean;
}

/** Índice de cartas indexado por código de marvelcdb. */
export type CardIndex = Record<string, DeckCardInfo>;

/** Mazo tal como lo guarda el usuario. */
export interface DeckDefinition {
  id: string;
  name: string;
  /** Código de la carta de identidad del héroe, p. ej. "01001a". */
  heroCode: string;
  /** card_set_code del héroe, p. ej. "spider_man". */
  heroSetCode: string;
  /** Aspecto elegido, o null para un mazo solo con básicas. */
  aspect: AspectFaction | null;
  /** Código de carta → número de copias en el mazo. */
  cards: Record<string, number>;
}

export interface MissingCopies {
  title: string;
  needed: number;
  owned: number;
}

export interface DeckValidation {
  /** true si el mazo cumple todas las reglas de construcción. */
  ok: boolean;
  /** Incumplimientos de reglas. Bloquean el mazo. */
  errors: string[];
  /** Cartas (sin contar la identidad) que suman al mazo. */
  totalCards: number;
  /**
   * Copias que el mazo necesita y que el jugador no posee. No bloquea el
   * mazo: se usa como referencia, porque la app también admite mazos
   * pensados para comprar.
   */
  missing: MissingCopies[];
}

const isAspect = (f: string): f is AspectFaction =>
  (ASPECT_FACTIONS as readonly string[]).includes(f);

/**
 * Valida un mazo contra las reglas de construcción.
 *
 * @param deck   Mazo a validar.
 * @param index  Índice de cartas (catálogo).
 * @param owned  Copias que posee el jugador, por código de carta. Opcional.
 */
export function validateDeck(
  deck: DeckDefinition,
  index: CardIndex,
  owned: Record<string, number> = {},
): DeckValidation {
  const errors: string[] = [];
  let totalCards = 0;
  const copiesByTitle = new Map<string, { count: number; limit: number }>();
  const aspectsFound = new Set<AspectFaction>();
  const titlesInDeck = new Set<string>();

  for (const [code, rawQty] of Object.entries(deck.cards)) {
    const qty = Math.trunc(rawQty);
    if (qty <= 0) continue;

    const info = index[code];
    if (!info) {
      errors.push(`Carta desconocida en el mazo: ${code}.`);
      continue;
    }
    if (info.isIdentity || code === deck.heroCode) {
      errors.push(
        `«${info.title}» es una carta de identidad y no va en el mazo.`,
      );
      continue;
    }

    if (info.factionCode === HERO_FACTION) {
      if (info.heroSetCode !== deck.heroSetCode) {
        errors.push(`«${info.title}» es una carta de otro héroe.`);
        continue;
      }
    } else if (isAspect(info.factionCode)) {
      aspectsFound.add(info.factionCode);
    } else if (info.factionCode !== BASIC_FACTION) {
      errors.push(
        `«${info.title}» no es una carta válida para un mazo de jugador.`,
      );
      continue;
    }

    totalCards += qty;
    const entry = copiesByTitle.get(info.title) ?? { count: 0, limit: 0 };
    entry.count += qty;
    entry.limit = Math.max(entry.limit, info.deckLimit);
    copiesByTitle.set(info.title, entry);
    titlesInDeck.add(info.title);
  }

  // Tamaño del mazo
  if (totalCards < DECK_MIN_CARDS) {
    errors.push(
      `El mazo tiene ${totalCards} cartas; necesita al menos ${DECK_MIN_CARDS}.`,
    );
  } else if (totalCards > DECK_MAX_CARDS) {
    errors.push(
      `El mazo tiene ${totalCards} cartas; no puede tener más de ${DECK_MAX_CARDS}.`,
    );
  }

  // Límite de copias por título
  for (const [title, { count, limit }] of copiesByTitle) {
    if (limit > 0 && count > limit) {
      errors.push(`Máximo ${limit} de «${title}» (tienes ${count}).`);
    }
  }

  // Un único aspecto
  if (aspectsFound.size > 1) {
    errors.push(
      `Solo se permite un aspecto por mazo (encontrados: ${[...aspectsFound].join(", ")}).`,
    );
  } else if (aspectsFound.size === 1) {
    const [only] = [...aspectsFound];
    if (deck.aspect !== only) {
      errors.push(
        `Las cartas son de aspecto ${only}, pero el mazo está declarado como ${deck.aspect ?? "sin aspecto"}.`,
      );
    }
  }

  // Cartas específicas del héroe obligatorias
  const requiredTitles = new Set<string>();
  for (const info of Object.values(index)) {
    if (
      info.factionCode === HERO_FACTION &&
      info.heroSetCode === deck.heroSetCode &&
      !info.isIdentity
    ) {
      requiredTitles.add(info.title);
    }
  }
  for (const title of requiredTitles) {
    if (!titlesInDeck.has(title)) {
      errors.push(`Falta una carta específica del héroe: «${title}».`);
    }
  }

  // Copias que faltan en la colección (agrupadas por título)
  const ownedByTitle = new Map<string, number>();
  for (const [code, qty] of Object.entries(owned)) {
    const info = index[code];
    if (!info) continue;
    ownedByTitle.set(info.title, (ownedByTitle.get(info.title) ?? 0) + qty);
  }
  const missing: MissingCopies[] = [];
  for (const [title, { count }] of copiesByTitle) {
    const have = ownedByTitle.get(title) ?? 0;
    if (have < count) {
      missing.push({ title, needed: count, owned: have });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    totalCards,
    missing,
  };
}

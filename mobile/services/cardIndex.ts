// Índice de cartas de jugador para construir y validar mazos. Deriva del
// mismo catálogo crudo que heroCatalog.ts (ver cardCatalog.ts), filtrando
// solo las cartas que pueden ir en un mazo de jugador: identidades,
// cartas específicas de cada héroe, cartas de los 4 aspectos y básicas.
//
// El resultado es un CardIndex con la forma exacta que espera
// validateDeck() en engine/src/deck/deckRules.ts, así que se puede pasar
// directamente del uno al otro sin ninguna conversión intermedia:
//
//   import { validateDeck, type CardIndex } from "engine";
//   const { index } = await getPlayerCardIndex();
//   validateDeck(miMazo, index, misCartasPoseidas);
//
// Deliberadamente NO cubre solo los héroes ya jugables ahora (de momento
// solo Spider-Man, porque el único villano implementado es Rino): indexa
// el catálogo completo de cartas de jugador de la API, para no tener que
// volver a tocar este servicio cuando se añadan más héroes o villanos.
import type { CardIndex, DeckCardInfo } from "engine";
import { getRawCardCatalog, type RawCard } from "./cardCatalog";

// Códigos de facción de cartas de JUGADOR, verificados contra la API
// pública de marvelcdb (ver el encabezado de deckRules.ts para el detalle
// de cada uno). Cualquier otra facción (cartas de encuentro, villano, etc.)
// se descarta: no pueden ir en un mazo de jugador.
const PLAYER_FACTION_CODES = new Set([
  "hero",
  "aggression",
  "justice",
  "leadership",
  "protection",
  "basic",
]);

// Las dos caras de la identidad de un héroe. Confirmado contra la API:
// cara héroe → type_code "hero" (p.ej. Spider-Man, 01001a); cara alter
// ego → type_code "alter_ego" (p.ej. Peter Parker, 01001b). Ninguna de las
// dos va en el mazo del personaje.
const IDENTITY_TYPE_CODES = new Set(["hero", "alter_ego"]);

function toCardIndexEntry(card: RawCard): DeckCardInfo | null {
  if (!card.code || !card.name) return null;
  if (!PLAYER_FACTION_CODES.has(card.faction_code)) return null;

  return {
    code: card.code,
    title: card.name,
    factionCode: card.faction_code,
    // heroSetCode solo tiene sentido para cartas de facción "hero"
    // (identidad + específicas del héroe); para aspectos y básicas es
    // irrelevante, igual que espera DeckCardInfo.
    heroSetCode:
      card.faction_code === "hero" ? (card.card_set_code ?? null) : null,
    deckLimit: typeof card.deck_limit === "number" ? card.deck_limit : 0,
    isIdentity: IDENTITY_TYPE_CODES.has(card.type_code),
  };
}

function buildCardIndex(rawCards: RawCard[]): CardIndex {
  const index: CardIndex = {};
  for (const card of rawCards) {
    const entry = toCardIndexEntry(card);
    if (entry) {
      index[entry.code] = entry;
    }
  }
  return index;
}

export interface PlayerCardIndexResult {
  index: CardIndex;
  fetchedAt: string | null;
  fromCache: boolean;
}

/**
 * Devuelve el índice de cartas de jugador, usando la caché local (ver
 * cardCatalog.ts) si está fresca. Si hay que refrescar y falla la red,
 * cardCatalog.ts ya cae de vuelta a su caché (aunque esté caducada) antes
 * que fallar del todo; esta función solo lanza si eso tampoco hay.
 */
export async function getPlayerCardIndex(
  options: { forceRefresh?: boolean } = {},
): Promise<PlayerCardIndexResult> {
  const { cards, fetchedAt, fromCache } = await getRawCardCatalog(options);
  const index = buildCardIndex(cards);
  if (Object.keys(index).length === 0) {
    throw new Error("El catálogo descargado no contiene cartas de jugador.");
  }
  return { index, fetchedAt, fromCache };
}

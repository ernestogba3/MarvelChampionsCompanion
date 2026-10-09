// Catálogo crudo de cartas de marvelcdb, compartido por heroCatalog.ts
// (lista de héroes para elegir en Inicio) y cardIndex.ts (índice de cartas
// de jugador para construir mazos). Se descarga y cachea UNA sola vez aquí:
// ambos servicios derivan su propia vista a partir de este mismo JSON
// crudo, en vez de descargar el catálogo completo (varios MB) por
// duplicado.
import { loadCardCatalogRaw, saveCardCatalogRaw } from "../storage/gameStorage";

// es.marvelcdb para que los nombres salgan en español, igual que el resto
// de la app. Este endpoint devuelve TODAS las cartas del juego (jugador +
// encuentro); cada servicio que lo consume filtra lo que necesita.
const CARDS_ENDPOINT = "https://es.marvelcdb.com/api/public/cards/";

// marvelcdb añade contenido nuevo cada pocos meses; una caché de 30 días es
// de sobra y evita re-descargar varios MB en cada arranque de la app.
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Forma cruda de una carta tal como la devuelve marvelcdb. Solo se listan
 * los campos que los servicios de la app realmente usan; el resto de
 * campos que trae la API se conservan (índice abierto) pero no se tipan.
 *
 * Confirmado contra la API pública en esta sesión:
 *   - identidad (cara héroe): type_code "hero"
 *   - identidad (cara alter ego): type_code "alter_ego"
 *   - específica de héroe (p.ej. "Black Cat", 01002): type_code "ally",
 *     faction_code "hero", card_set_code "spider_man"
 * Y en sesiones anteriores:
 *   - aspectos: faction_code "aggression" | "justice" | "leadership" |
 *     "protection"
 *   - básicas: faction_code "basic"
 */
export interface RawCard {
  code: string;
  name: string;
  type_code: string;
  faction_code: string;
  card_set_code?: string | null;
  deck_limit?: number;
  quantity?: number;
  is_unique?: boolean;
  duplicate_of_code?: string | null;
  linked_to_code?: string | null;
  linked_card?: { code: string; name: string } | null;
  health?: number;
  imagesrc?: string;
  [key: string]: unknown;
}

interface CachedCardCatalog {
  fetchedAt: string;
  cards: RawCard[];
}

function readCache(raw: string | null): CachedCardCatalog | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedCardCatalog;
    if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
      return parsed;
    }
  } catch {
    // caché corrupta: se ignora
  }
  return null;
}

async function fetchFreshCards(): Promise<RawCard[]> {
  const response = await fetch(CARDS_ENDPOINT);
  if (!response.ok) {
    throw new Error(
      `No se pudo descargar el catálogo de cartas (HTTP ${response.status}).`,
    );
  }
  const rawCards = (await response.json()) as RawCard[];
  if (!Array.isArray(rawCards) || rawCards.length === 0) {
    throw new Error("El catálogo descargado no contiene ninguna carta.");
  }
  return rawCards;
}

export interface CardCatalogResult {
  cards: RawCard[];
  fetchedAt: string | null;
  fromCache: boolean;
}

/**
 * Descarga (o lee de caché) la lista completa de cartas de marvelcdb, sin
 * filtrar. heroCatalog.ts y cardIndex.ts derivan su propia vista a partir
 * de este resultado, así solo se descarga una vez.
 *
 * Si hay que refrescar y falla la red, cae de vuelta a la caché (aunque
 * esté caducada) antes que fallar del todo. Solo lanza si no hay ni caché
 * ni red disponible.
 */
export async function getRawCardCatalog(
  options: { forceRefresh?: boolean } = {},
): Promise<CardCatalogResult> {
  const cached = readCache(await loadCardCatalogRaw());
  const cacheIsFresh =
    cached !== null &&
    Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_MAX_AGE_MS;

  if (!options.forceRefresh && cacheIsFresh) {
    return {
      cards: cached!.cards,
      fetchedAt: cached!.fetchedAt,
      fromCache: true,
    };
  }

  try {
    const cards = await fetchFreshCards();
    const fetchedAt = new Date().toISOString();
    await saveCardCatalogRaw(JSON.stringify({ fetchedAt, cards }));
    return { cards, fetchedAt, fromCache: false };
  } catch (err) {
    if (cached) {
      // Sin red (o marvelcdb caído), pero hay caché previa: mejor una
      // lista algo vieja que ninguna.
      return {
        cards: cached.cards,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
      };
    }
    throw err;
  }
}

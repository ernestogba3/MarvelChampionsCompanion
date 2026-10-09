import { loadHeroCatalog, saveHeroCatalog } from "../storage/gameStorage";

export interface HeroCatalogEntry {
  heroName: string;
  alterEgoName: string;
  heroCardId: string;
  alterEgoCardId: string;
  health: number;
}

interface CachedHeroCatalog {
  fetchedAt: string;
  heroes: HeroCatalogEntry[];
}

// es.marvelcdb para que los nombres salgan en español, igual que el resto
// de la app. Este endpoint devuelve TODAS las cartas del juego (jugador +
// encuentro); de ahí nos quedamos solo con las de tipo "hero" — cada una ya
// trae enlazada su alter ego (linked_card / linked_to_code), confirmado
// contra la carta de Capitán América (03001a héroe -> 03001b Steve Rogers).
const CARDS_ENDPOINT = "https://es.marvelcdb.com/api/public/cards/";

// Los héroes nuevos de marvelcdb salen cada pocos meses, así que una caché
// de 30 días es más que suficiente y evita descargar varios MB en cada
// arranque de la app.
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const FALLBACK_HERO: HeroCatalogEntry = {
  heroName: "Spider-Man",
  alterEgoName: "Peter Parker",
  heroCardId: "01001a",
  alterEgoCardId: "01001b",
  health: 10,
};

function parseHeroEntries(rawCards: any[]): HeroCatalogEntry[] {
  const heroes: HeroCatalogEntry[] = [];
  for (const card of rawCards) {
    if (card?.type_code !== "hero" || !card.code || !card.name) continue;
    const alterEgo = card.linked_card;
    heroes.push({
      heroName: card.name,
      alterEgoName: alterEgo?.name ?? card.name,
      heroCardId: card.code,
      alterEgoCardId: card.linked_to_code ?? "",
      health: typeof card.health === "number" ? card.health : 10,
    });
  }
  heroes.sort((a, b) => a.heroName.localeCompare(b.heroName, "es"));
  return heroes;
}

async function fetchFreshCatalog(): Promise<HeroCatalogEntry[]> {
  const response = await fetch(CARDS_ENDPOINT);
  if (!response.ok) {
    throw new Error(
      `No se pudo descargar el catálogo de héroes (HTTP ${response.status}).`,
    );
  }
  const rawCards = await response.json();
  const heroes = parseHeroEntries(rawCards);
  if (heroes.length === 0) {
    throw new Error("El catálogo descargado no contiene ningún héroe.");
  }
  return heroes;
}

function readCache(raw: string | null): CachedHeroCatalog | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedHeroCatalog;
    if (Array.isArray(parsed.heroes) && parsed.heroes.length > 0) {
      return parsed;
    }
  } catch {
    // caché corrupta: se ignora
  }
  return null;
}

export interface HeroCatalogResult {
  heroes: HeroCatalogEntry[];
  fetchedAt: string | null;
  fromCache: boolean;
}

/**
 * Devuelve el catálogo de héroes, usando la caché local si está fresca.
 * Si hay que refrescar y falla la red, cae de vuelta a la caché (aunque
 * esté caducada) antes que fallar del todo. Solo lanza si no hay ni caché
 * ni red disponible.
 */
export async function getHeroCatalog(
  options: { forceRefresh?: boolean } = {},
): Promise<HeroCatalogResult> {
  const cached = readCache(await loadHeroCatalog());
  const cacheIsFresh =
    cached !== null &&
    Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_MAX_AGE_MS;

  if (!options.forceRefresh && cacheIsFresh) {
    return {
      heroes: cached!.heroes,
      fetchedAt: cached!.fetchedAt,
      fromCache: true,
    };
  }

  try {
    const heroes = await fetchFreshCatalog();
    const fetchedAt = new Date().toISOString();
    await saveHeroCatalog(JSON.stringify({ fetchedAt, heroes }));
    return { heroes, fetchedAt, fromCache: false };
  } catch (err) {
    if (cached) {
      // Sin red (o marvelcdb caído), pero hay caché previa: mejor una lista
      // algo vieja que ninguna.
      return {
        heroes: cached.heroes,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
      };
    }
    throw err;
  }
}

// Lista de héroes para elegir en la pantalla de Inicio. A partir de esta
// sesión, el catálogo crudo de cartas ya no se descarga ni se cachea aquí:
// se delega en cardCatalog.ts (compartido con cardIndex.ts), y este
// servicio solo deriva la lista de héroes a partir de ese resultado.
import { getRawCardCatalog, type RawCard } from "./cardCatalog";

export interface HeroCatalogEntry {
  heroName: string;
  alterEgoName: string;
  heroCardId: string;
  alterEgoCardId: string;
  health: number;
}

export const FALLBACK_HERO: HeroCatalogEntry = {
  heroName: "Spider-Man",
  alterEgoName: "Peter Parker",
  heroCardId: "01001a",
  alterEgoCardId: "01001b",
  health: 10,
};

function parseHeroEntries(rawCards: RawCard[]): HeroCatalogEntry[] {
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

export interface HeroCatalogResult {
  heroes: HeroCatalogEntry[];
  fetchedAt: string | null;
  fromCache: boolean;
}

/**
 * Devuelve el catálogo de héroes, usando la caché local (ver
 * cardCatalog.ts) si está fresca. Si hay que refrescar y falla la red,
 * cardCatalog.ts ya cae de vuelta a su caché (aunque esté caducada) antes
 * que fallar del todo; esta función solo lanza si eso tampoco hay.
 */
export async function getHeroCatalog(
  options: { forceRefresh?: boolean } = {},
): Promise<HeroCatalogResult> {
  const { cards, fetchedAt, fromCache } = await getRawCardCatalog(options);
  const heroes = parseHeroEntries(cards);
  if (heroes.length === 0) {
    throw new Error("El catálogo descargado no contiene ningún héroe.");
  }
  return { heroes, fetchedAt, fromCache };
}

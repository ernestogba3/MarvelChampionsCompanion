// Datos para el "mazo del pack" de cada héroe (ver engine/src/deck/packDeck.ts).
// Deriva del mismo catálogo crudo de marvelcdb que heroCatalog.ts y
// cardIndex.ts (cardCatalog.ts lo descarga y cachea una sola vez), así que
// funciona sin red en cuanto el catálogo está en caché.
import type { PackCardInfo } from "engine";
import { getRawCardCatalog, type RawCard } from "./cardCatalog";

function toPackCardInfo(card: RawCard): PackCardInfo | null {
  if (!card.code || typeof card.pack_code !== "string") return null;
  return {
    code: card.code,
    packCode: card.pack_code,
    typeCode: card.type_code,
    factionCode: card.faction_code,
    setCode: card.card_set_code ?? null,
    quantity: typeof card.quantity === "number" ? card.quantity : 0,
    deckLimit: typeof card.deck_limit === "number" ? card.deck_limit : 0,
  };
}

/** Catálogo en la forma que necesitan buildPackDeck y packAspects. */
export async function getPackCards(): Promise<PackCardInfo[]> {
  const { cards } = await getRawCardCatalog();
  const out: PackCardInfo[] = [];
  for (const card of cards) {
    const info = toPackCardInfo(card);
    if (info) out.push(info);
  }
  return out;
}

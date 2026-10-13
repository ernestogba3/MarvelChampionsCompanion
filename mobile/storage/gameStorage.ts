import * as SQLite from "expo-sqlite";
import type { DeckDefinition } from "engine";

const DB_NAME = "phasekeeper.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS saves (id INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL);",
      );
      // Reemplaza a la antigua tabla "hero_catalog": ahora cachea el
      // catálogo crudo de TODAS las cartas (no solo héroes), compartido
      // por services/heroCatalog.ts y services/cardIndex.ts. Si existía
      // la tabla vieja en el dispositivo, simplemente queda sin usar.
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS card_catalog (id INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL);",
      );
      // Colección del jugador: cuántas copias posee de cada carta, por
      // código de marvelcdb. Una fila por carta (no un único JSON como las
      // de arriba) porque aquí interesa poder sumar/restar una carta suelta
      // sin reescribir toda la colección. Una carta que no posee ninguna
      // copia simplemente no tiene fila (ver deleteOwnedCard más abajo).
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS owned_cards (code TEXT PRIMARY KEY NOT NULL, quantity INTEGER NOT NULL);",
      );
      // Mazos guardados por el jugador. Una fila por mazo (clave = su id),
      // con el DeckDefinition entero como JSON — misma forma que espera
      // validateDeck() en engine/src/deck/deckRules.ts.
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS decks (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);",
      );
      return db;
    })();
  }
  return dbPromise;
}

export async function initDatabase() {
  await getDb();
}

export async function saveGame(json: string) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO saves (id, data) VALUES (1, ?);",
    json,
  );
}

export async function loadGame(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    "SELECT data FROM saves WHERE id = 1;",
  );
  return row?.data ?? null;
}

export async function clearGame() {
  const db = await getDb();
  await db.runAsync("DELETE FROM saves WHERE id = 1;");
}

// Caché local del catálogo CRUDO de cartas descargado de marvelcdb (ver
// services/cardCatalog.ts). Un único registro con todo el JSON, igual que
// "saves" — se sobrescribe entero cada vez que se refresca. A partir de
// esta sesión cubre todas las cartas (antes solo héroes), porque tanto el
// selector de héroes como el constructor de mazos lo necesitan.
export async function saveCardCatalogRaw(json: string) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO card_catalog (id, data) VALUES (1, ?);",
    json,
  );
}

export async function loadCardCatalogRaw(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    "SELECT data FROM card_catalog WHERE id = 1;",
  );
  return row?.data ?? null;
}

// ---------------------------------------------------------------------------
// Colección del jugador (qué cartas posee y cuántas copias)
// ---------------------------------------------------------------------------

/**
 * Fija la cantidad poseída de una carta. 0 o menos borra la fila (no
 * guardamos ceros: para validateDeck(), una carta sin fila ya cuenta como
 * "0 copias posee­das").
 */
export async function setOwnedCardQuantity(code: string, quantity: number) {
  const db = await getDb();
  if (quantity <= 0) {
    await db.runAsync("DELETE FROM owned_cards WHERE code = ?;", code);
    return;
  }
  await db.runAsync(
    "INSERT OR REPLACE INTO owned_cards (code, quantity) VALUES (?, ?);",
    code,
    quantity,
  );
}

/**
 * Devuelve toda la colección como { código: cantidad }, en la misma forma
 * que espera el parámetro `owned` de validateDeck().
 */
export async function loadOwnedCards(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ code: string; quantity: number }>(
    "SELECT code, quantity FROM owned_cards;",
  );
  const owned: Record<string, number> = {};
  for (const row of rows) {
    owned[row.code] = row.quantity;
  }
  return owned;
}

/**
 * Reemplaza la colección entera de golpe (p.ej. al importar o al guardar
 * varios cambios a la vez desde la pantalla de Colección). Las cartas que
 * no aparezcan en `owned` quedan en 0 copias (se borran).
 */
export async function saveOwnedCards(owned: Record<string, number>) {
  const db = await getDb();
  await db.runAsync("DELETE FROM owned_cards;");
  for (const [code, quantity] of Object.entries(owned)) {
    if (quantity > 0) {
      await db.runAsync(
        "INSERT INTO owned_cards (code, quantity) VALUES (?, ?);",
        code,
        quantity,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Mazos guardados
// ---------------------------------------------------------------------------

export async function saveDeck(deck: DeckDefinition) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO decks (id, data) VALUES (?, ?);",
    deck.id,
    JSON.stringify(deck),
  );
}

export async function loadDecks(): Promise<DeckDefinition[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>(
    "SELECT data FROM decks;",
  );
  return rows.map((row) => JSON.parse(row.data) as DeckDefinition);
}

export async function loadDeck(id: string): Promise<DeckDefinition | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    "SELECT data FROM decks WHERE id = ?;",
    id,
  );
  return row ? (JSON.parse(row.data) as DeckDefinition) : null;
}

export async function deleteDeck(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM decks WHERE id = ?;", id);
}

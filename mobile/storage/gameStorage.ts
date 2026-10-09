import * as SQLite from "expo-sqlite";

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

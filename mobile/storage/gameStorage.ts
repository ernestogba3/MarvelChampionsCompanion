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
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS hero_catalog (id INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL);",
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

// Caché local del catálogo de héroes descargado de marvelcdb (ver
// services/heroCatalog.ts). Un único registro con todo el JSON, igual que
// "saves" — se sobrescribe entero cada vez que se refresca.
export async function saveHeroCatalog(json: string) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO hero_catalog (id, data) VALUES (1, ?);",
    json,
  );
}

export async function loadHeroCatalog(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    "SELECT data FROM hero_catalog WHERE id = 1;",
  );
  return row?.data ?? null;
}

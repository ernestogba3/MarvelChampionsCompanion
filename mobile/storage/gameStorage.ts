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

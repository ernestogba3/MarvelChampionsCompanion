import * as SQLite from "expo-sqlite";
const DB_NAME = "phasekeeper.db";
async function getDb() {
  return SQLite.openDatabaseAsync(DB_NAME);
}
export async function initDatabase() {
  const db = await getDb();
  await db.execAsync(
    "CREATE TABLE IF NOT EXISTS saves (id INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL);",
  );
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

import type { GameState } from "../domain/types";
const SAVE_FORMAT_VERSION = 1;
interface SaveFile {
  version: number;
  state: GameState;
}
export function serializeGameState(state: GameState): string {
  const saveFile: SaveFile = { version: SAVE_FORMAT_VERSION, state };
  return JSON.stringify(saveFile);
}
export function deserializeGameState(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("El archivo de partida guardada no es JSON válido.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    !("state" in parsed)
  ) {
    throw new Error(
      "El archivo de partida guardada no tiene el formato esperado.",
    );
  }
  const saveFile = parsed as SaveFile;
  if (saveFile.version !== SAVE_FORMAT_VERSION) {
    throw new Error(
      `Versión de guardado no soportada: ${saveFile.version}. Se esperaba ${SAVE_FORMAT_VERSION}.`,
    );
  }
  return saveFile.state;
}

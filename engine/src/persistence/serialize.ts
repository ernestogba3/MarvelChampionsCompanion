import type { GameState, PlayerState } from "../domain/types";

const SAVE_FORMAT_VERSION = 1;

interface SaveFile {
  version: number;
  state: GameState;
}

// Mapeo de héroe -> alter ego, para migrar partidas guardadas antes de que
// este campo existiera en PlayerState.
const ALTER_EGO_BY_HERO: Record<string, string> = {
  "Spider-Man": "Peter Parker",
};

function migratePlayer(player: PlayerState): PlayerState {
  if (player.alterEgoName) return player;
  return {
    ...player,
    alterEgoName: ALTER_EGO_BY_HERO[player.heroName] ?? player.heroName,
  };
}

function migrateState(state: GameState): GameState {
  return {
    ...state,
    difficulty: state.difficulty ?? "STANDARD",
    players: state.players.map(migratePlayer),
  };
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
  return migrateState(saveFile.state);
}

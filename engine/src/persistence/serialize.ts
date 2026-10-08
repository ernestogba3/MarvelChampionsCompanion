import type {
  GameState,
  PlayerState,
  SchemeState,
  VillainState,
} from "../domain/types";

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

// Mapeo de estadio de Rino -> cardId, para migrar partidas guardadas antes
// de que VillainState tuviera este campo.
const VILLAIN_CARD_ID_BY_STAGE: Record<string, string> = {
  I: "01094",
  II: "01095",
  III: "01096",
};

// Mapeo de id de scheme / nombre -> cardId, para migrar partidas guardadas
// antes de que SchemeState tuviera este campo.
const MAIN_SCHEME_CARD_ID_BY_ID: Record<string, string> = {
  "main-break-in": "01097",
};
const SIDE_SCHEME_CARD_ID_BY_NAME: Record<string, string> = {
  "Arramblar con todo": "01107",
  "Control de multitudes": "01108",
};

function migratePlayer(player: PlayerState): PlayerState {
  if (player.alterEgoName) return player;
  return {
    ...player,
    alterEgoName: ALTER_EGO_BY_HERO[player.heroName] ?? player.heroName,
  };
}

function migrateScheme(scheme: SchemeState): SchemeState {
  let migrated = scheme;
  if (migrated.accelerationTokens === undefined) {
    migrated = { ...migrated, accelerationTokens: 0 };
  }
  if (!migrated.cardId) {
    const cardId = migrated.isMain
      ? MAIN_SCHEME_CARD_ID_BY_ID[migrated.id]
      : SIDE_SCHEME_CARD_ID_BY_NAME[migrated.name];
    migrated = { ...migrated, cardId: cardId ?? "" };
  }
  return migrated;
}

function migrateVillain(villain: VillainState): VillainState {
  if (villain.cardId) return villain;
  return {
    ...villain,
    cardId: VILLAIN_CARD_ID_BY_STAGE[villain.stage] ?? "",
  };
}

function migrateState(state: GameState): GameState {
  return {
    ...state,
    difficulty: state.difficulty ?? "STANDARD",
    players: state.players.map(migratePlayer),
    schemes: state.schemes.map(migrateScheme),
    villain: migrateVillain(state.villain),
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

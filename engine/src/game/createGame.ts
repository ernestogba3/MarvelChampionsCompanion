import type { Difficulty, GameState, PlayerState } from "../domain/types.ts";

const RHINO_STANDARD_ENCOUNTER_DECK: string[] = [
  "01098",
  "01099",
  "01099",
  "01100",
  "01101",
  "01101",
  "01102",
  "01103",
  "01104",
  "01104",
  "01105",
  "01105",
  "01106",
  "01106",
  "01106",
  "01107",
  "01108",
  "01186",
  "01186",
  "01187",
  "01187",
  "01188",
  "01189",
  "01190",
];

export interface PlayerSetup {
  id: string;
  heroName: string;
  alterEgoName: string;
  // La vida del héroe NUNCA escala por número de jugadores (es la impresa en
  // su propia carta de identidad) — a diferencia de los PG del villano y el
  // umbral del plan principal, que sí escalan ×nº de jugadores.
  health: number;
  // IDs de marvelcdb de cada cara de la identidad (p.ej. "01001a" / "01001b"
  // para Spider-Man / Peter Parker), para mostrar la ilustración correcta
  // según la forma actual del jugador. Opcionales: sin ellos, simplemente no
  // se muestra miniatura para ese jugador.
  heroCardId?: string;
  alterEgoCardId?: string;
}

function buildPlayers(setups: PlayerSetup[]): PlayerState[] {
  return setups.map((setup) => ({
    id: setup.id,
    heroName: setup.heroName,
    alterEgoName: setup.alterEgoName,
    form: "ALTER_EGO",
    health: setup.health,
    maxHealth: setup.health,
    faceDownEncounterCards: [],
    stunned: false,
    upgradesInPlay: [],
    heroCardId: setup.heroCardId,
    alterEgoCardId: setup.alterEgoCardId,
  }));
}

/**
 * Crea una partida de Rino para 1-4 jugadores. Confirmado contra el RRG
 * v1.7 y los datos per-player de marvelcdb: los PG del villano y el umbral
 * del plan principal escalan ×nº de jugadores; la amenaza inicial del plan
 * principal es fija (0) y no escala. La aceleración por ronda ya escala
 * aparte, dentro de addThreatStep (multiplica escalationThreat × nº de
 * jugadores, sin tocar aquí).
 */
export function createRhinoGame(
  playerSetups: PlayerSetup[],
  difficulty: Difficulty = "STANDARD",
): GameState {
  if (playerSetups.length === 0) {
    throw new Error("Se necesita al menos un jugador para crear la partida.");
  }

  const playerCount = playerSetups.length;
  const players = buildPlayers(playerSetups);
  const firstPlayerId = players[0].id;

  const mainScheme = {
    id: "main-break-in",
    cardId: "01097",
    name: "¡Allanamiento!",
    threat: 0,
    threatToComplete: 7 * playerCount,
    escalationThreat: 1,
    isMain: true,
    accelerationTokens: 0,
  };

  if (difficulty === "EXPERT") {
    // En Experto: Rino arranca en estadio II (habilidad al revelarse: Arramblar con todo en juego).
    // Al derrotar a Rino II pasa a Rino III, cuya muerte es la victoria.
    const health = 15 * playerCount;
    return {
      round: 1,
      phase: { name: "PLAYER_PHASE" },
      difficulty: "EXPERT",
      firstPlayerId,
      players,
      villain: {
        cardId: "01095",
        name: "Rhino",
        stage: "II",
        health,
        maxHealth: health,
        attack: 3,
        scheme: 1,
        tough: false,
        attachments: [],
      },
      schemes: [
        mainScheme,
        {
          id: "side-breakin-takin",
          cardId: "01107",
          name: "Arramblar con todo",
          threat: 2,
          threatToComplete: 0,
          escalationThreat: 0,
          isMain: false,
          accelerationTokens: 0,
        },
      ],
      minions: [],
      encounterDeck: [...RHINO_STANDARD_ENCOUNTER_DECK],
      encounterDiscard: [],
      pendingEncounterDeals: [],
      reservedNemesis: null,
      eventLog: [],
    };
  }

  // Estándar: Rino arranca en estadio I. Al derrotarlo pasa a II, cuya muerte es la victoria.
  const health = 14 * playerCount;
  return {
    round: 1,
    phase: { name: "PLAYER_PHASE" },
    difficulty: "STANDARD",
    firstPlayerId,
    players,
    villain: {
      cardId: "01094",
      name: "Rhino",
      stage: "I",
      health,
      maxHealth: health,
      attack: 2,
      scheme: 1,
      tough: false,
      attachments: [],
    },
    schemes: [mainScheme],
    minions: [],
    encounterDeck: [...RHINO_STANDARD_ENCOUNTER_DECK],
    // sin barajar a propósito: el orden real se decide fuera del motor, para que los tests sean deterministas
    encounterDiscard: [],
    pendingEncounterDeals: [],
    reservedNemesis: null,
    eventLog: [],
  };
}

/**
 * Compatibilidad con el código y tests existentes de 1 jugador (Spider-Man).
 * Es un envoltorio de createRhinoGame con un único PlayerSetup — el
 * comportamiento para 1 jugador es idéntico al de antes (14/15 PG, umbral 7).
 */
export function createSpiderManVsRhinoGame(
  playerId: string = "player-1",
  difficulty: Difficulty = "STANDARD",
): GameState {
  return createRhinoGame(
    [
      {
        id: playerId,
        heroName: "Spider-Man",
        alterEgoName: "Peter Parker",
        health: 10,
        heroCardId: "01001a",
        alterEgoCardId: "01001b",
      },
    ],
    difficulty,
  );
}

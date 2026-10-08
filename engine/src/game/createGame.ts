import type { Difficulty, GameState } from "../domain/types.ts";

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

export function createSpiderManVsRhinoGame(
  playerId: string = "player-1",
  difficulty: Difficulty = "STANDARD",
): GameState {
  const playerState: GameState["players"][number] = {
    id: playerId,
    heroName: "Spider-Man",
    alterEgoName: "Peter Parker",
    form: "ALTER_EGO",
    health: 10,
    maxHealth: 10,
    faceDownEncounterCards: [],
    stunned: false,
    upgradesInPlay: [],
  };

  const mainScheme = {
    id: "main-break-in",
    cardId: "01097",
    name: "¡Allanamiento!",
    threat: 0,
    threatToComplete: 7,
    escalationThreat: 1,
    isMain: true,
    accelerationTokens: 0,
  };

  if (difficulty === "EXPERT") {
    // En Experto: Rino arranca en estadio II (habilidad al revelarse: Arramblar con todo en juego).
    // Al derrotar a Rino II pasa a Rino III, cuya muerte es la victoria.
    return {
      round: 1,
      phase: { name: "PLAYER_PHASE" },
      difficulty: "EXPERT",
      firstPlayerId: playerId,
      players: [playerState],
      villain: {
        cardId: "01095",
        name: "Rhino",
        stage: "II",
        health: 15,
        maxHealth: 15,
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
  return {
    round: 1,
    phase: { name: "PLAYER_PHASE" },
    difficulty: "STANDARD",
    firstPlayerId: playerId,
    players: [playerState],
    villain: {
      cardId: "01094",
      name: "Rhino",
      stage: "I",
      health: 14,
      maxHealth: 14,
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

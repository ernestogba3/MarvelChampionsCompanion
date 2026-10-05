import type { GameState } from '../domain/types.ts'; const RHINO_STANDARD_ENCOUNTER_DECK: string[] = [ '01098', '01099', '01099', '01100', '01101', '01101', '01102', '01103', '01104', '01104', '01105', '01105', '01106', '01106', '01106', '01107', '01108', '01186', '01186', '01187', '01187', '01188', '01189', '01190', ]; export function createSpiderManVsRhinoGame(playerId: string): GameState {
  const playerState: GameState['players'][number] = {
    id: playerId,
    heroName: 'Spider-Man',
    form: 'ALTER_EGO',
    health: 10,
    maxHealth: 10,
    faceDownEncounterCards: [],
    stunned: false,
    upgradesInPlay: [],
  };

  return {
    round: 1,
    phase: { name: 'PLAYER_PHASE' },
    firstPlayerId: playerId,
    players: [playerState],
    villain: {
      name: 'Rhino',
      stage: 'I',
      health: 14,
      maxHealth: 14,
      attack: 2,
      scheme: 1,
      tough: false,
      attachments: [],
    },
    schemes: [
      {
        id: 'main-break-in',
        name: '¡Allanamiento!',
        threat: 0,
        threatToComplete: 7,
        escalationThreat: 1,
        isMain: true,
      },
    ],
    minions: [],
    encounterDeck: [...RHINO_STANDARD_ENCOUNTER_DECK],
    // sin barajar a propósito: el orden real se decide fuera del motor, para que los tests sean deterministas
    encounterDiscard: [],
    pendingEncounterDeals: [],
    reservedNemesis: null,
  };
}
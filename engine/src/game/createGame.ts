import type { GameState } from '../domain/types.js';

export function createSpiderManVsRhinoGame(playerId: string): GameState {
  return {
    round: 1,
    phase: { name: 'PLAYER_PHASE' },
    firstPlayerId: playerId,
    players: [
      {
        id: playerId,
        heroName: 'Spider-Man',
        form: 'ALTER_EGO',
        health: 10,
        maxHealth: 10,
        faceDownEncounterCards: [],
        stunned: false,
        upgradesInPlay: [],
      },
    ],
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
    encounterDeck: [],
    encounterDiscard: [],
    pendingEncounterDeals: [],
    reservedNemesis: null,
  };
}

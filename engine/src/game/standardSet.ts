import type { GameState } from '../domain/types.js';
import type { GameEvent } from '../events/types.js';

export function resolveAdvance(
  state: GameState,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const mainScheme = state.schemes.find(
    (s: (typeof state.schemes)[number]) => s.isMain,
  )!;
  const amount = state.villain.scheme;

  events.push({ type: 'VILLAIN_SCHEMED', schemeId: mainScheme.id, amount });

  return {
    state: {
      ...state,
      schemes: state.schemes.map((s) =>
        s.id === mainScheme.id ? { ...s, threat: s.threat + amount } : s,
      ),
    },
    events,
  };
}

export function resolveAssault(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const player = state.players.find(
    (p: (typeof state.players)[number]) => p.id === playerId,
  )!;

  if (player.form === 'ALTER_EGO') {
    events.push({ type: 'CARD_GAINED_SURGE', cardName: 'Agresión' });
    return { state, events };
  }

  const amount = state.villain.attack;
  events.push({ type: 'VILLAIN_ATTACKED', playerId, amount });

  return {
    state: {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, health: Math.max(0, p.health - amount) } : p,
      ),
      pendingEncounterDeals: [...state.pendingEncounterDeals, playerId],
    },
    events,
  };
}

export function resolveCaughtOffGuard(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const player = state.players.find(
    (p: (typeof state.players)[number]) => p.id === playerId,
  )!;

  if (player.upgradesInPlay.length === 0) {
    events.push({ type: 'CARD_GAINED_SURGE', cardName: 'Con la guardia baja' });
    return { state, events };
  }

  const [discarded, ...rest] = player.upgradesInPlay;
  events.push({ type: 'UPGRADE_DISCARDED', playerId, upgradeId: discarded });

  return {
    state: {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, upgradesInPlay: rest } : p,
      ),
    },
    events,
  };
}

export function resolveGangUp(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const player = state.players.find(
    (p: (typeof state.players)[number]) => p.id === playerId,
  )!;

  if (player.form === 'ALTER_EGO') {
    events.push({ type: 'CARD_GAINED_SURGE', cardName: 'Todos a una' });
    return { state, events };
  }

  let totalDamage = state.villain.attack;
  events.push({ type: 'VILLAIN_ATTACKED', playerId, amount: state.villain.attack });

  const engagedMinions = state.minions.filter(
    (m: (typeof state.minions)[number]) => m.engagedWith === playerId,
  );

  for (const m of engagedMinions) {
    totalDamage += m.attack;
    events.push({ type: 'DAMAGE_DEALT', targetId: playerId, amount: m.attack, source: m.name });
  }

  const pendingDeals = [...state.pendingEncounterDeals, playerId];
  for (let i = 0; i < engagedMinions.length; i++) pendingDeals.push(playerId);

  return {
    state: {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, health: Math.max(0, p.health - totalDamage) } : p,
      ),
      pendingEncounterDeals: pendingDeals,
    },
    events,
  };
}

export function resolveShadowOfThePast(
  state: GameState,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const nemesis = state.reservedNemesis;

  if (!nemesis) {
    events.push({ type: 'CARD_GAINED_SURGE', cardName: 'Una sombra del pasado' });
    return { state, events };
  }

  const titleClash = state.minions.some(
    (m: (typeof state.minions)[number]) => m.name === nemesis.minionName,
  );
  const sideSchemeId = `nemesis-side-${nemesis.sideSchemeCardId}`;
  let newMinions = state.minions;

  if (!titleClash) {
    newMinions = [
      ...state.minions,
      {
        id: `nemesis-${nemesis.minionCardId}`,
        cardId: nemesis.minionCardId,
        name: nemesis.minionName,
        attack: 0,
        // TODO: valores reales pendientes (ver scenario-rhino.md, set Némesis Spider-Man)
        scheme: 0,
        health: 1,
        maxHealth: 1,
        engagedWith: state.players[0]?.id ?? null,
        tough: false,
        guard: false,
      },
    ];
  } else {
    events.push({ type: 'CARD_GAINED_SURGE', cardName: 'Una sombra del pasado' });
  }

  events.push({
    type: 'SIDE_SCHEME_ENTERED',
    schemeId: sideSchemeId,
    name: nemesis.sideSchemeName,
  });

  return {
    state: {
      ...state,
      minions: newMinions,
      schemes: [
        ...state.schemes,
        {
          id: sideSchemeId,
          name: nemesis.sideSchemeName,
          threat: 0,
          threatToComplete: 0,
          escalationThreat: 0,
          isMain: false,
        },
      ],
      encounterDeck: [...state.encounterDeck, ...nemesis.remainingCardIds],
      reservedNemesis: null,
    },
    events,
  };
}

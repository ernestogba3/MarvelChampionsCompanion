import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import type { Effect } from "../effects/types";
import { applyEffects } from "../effects/applyEffect";
export function resolveAdvance(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const mainScheme = state.schemes.find((s) => s.isMain)!;
  const amount = state.villain.scheme;
  const { state: afterEffects, events: effectEvents } = applyEffects(state, [
    { type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount },
  ]);
  return {
    state: afterEffects,
    events: [
      { type: "VILLAIN_SCHEMED", schemeId: mainScheme.id, amount },
      ...effectEvents,
    ],
  };
}
export function resolveAssault(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId)!;
  if (player.form === "ALTER_EGO") {
    return applyEffects(state, [{ type: "GAIN_SURGE", cardName: "Agresión" }]);
  }
  const amount = state.villain.attack;
  const { state: afterEffects, events: effectEvents } = applyEffects(state, [
    {
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId },
      amount,
      source: "Agresión",
    },
    { type: "QUEUE_ENCOUNTER_CARD", playerId },
  ]);
  return {
    state: afterEffects,
    events: [{ type: "VILLAIN_ATTACKED", playerId, amount }, ...effectEvents],
  };
}
export function resolveCaughtOffGuard(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId)!;
  if (player.upgradesInPlay.length === 0) {
    return applyEffects(state, [
      { type: "GAIN_SURGE", cardName: "Con la guardia baja" },
    ]);
  }
  const [discarded] = player.upgradesInPlay;
  return applyEffects(state, [
    { type: "DISCARD_UPGRADE", playerId, upgradeId: discarded },
  ]);
}
export function resolveGangUp(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId)!;
  if (player.form === "ALTER_EGO") {
    return applyEffects(state, [
      { type: "GAIN_SURGE", cardName: "Todos a una" },
    ]);
  }
  const engagedMinions = state.minions.filter(
    (m) => m.engagedWith === playerId,
  );
  const effects: Effect[] = [
    {
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId },
      amount: state.villain.attack,
      source: "villain",
    },
    { type: "QUEUE_ENCOUNTER_CARD", playerId },
  ];
  for (const m of engagedMinions) {
    effects.push({
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId },
      amount: m.attack,
      source: m.name,
    });
    effects.push({ type: "QUEUE_ENCOUNTER_CARD", playerId });
  }
  const { state: afterEffects, events: effectEvents } = applyEffects(
    state,
    effects,
  );
  return {
    state: afterEffects,
    events: [
      { type: "VILLAIN_ATTACKED", playerId, amount: state.villain.attack },
      ...effectEvents,
    ],
  };
}
export function resolveShadowOfThePast(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  const nemesis = state.reservedNemesis;
  if (!nemesis) {
    events.push({
      type: "CARD_GAINED_SURGE",
      cardName: "Una sombra del pasado",
    });
    return { state, events };
  }
  const titleClash = state.minions.some((m) => m.name === nemesis.minionName);
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
        scheme: 0,
        health: 1,
        maxHealth: 1,
        engagedWith: state.players[0]?.id ?? null,
        tough: false,
        guard: false,
      },
    ];
  } else {
    events.push({
      type: "CARD_GAINED_SURGE",
      cardName: "Una sombra del pasado",
    });
  }
  events.push({
    type: "SIDE_SCHEME_ENTERED",
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

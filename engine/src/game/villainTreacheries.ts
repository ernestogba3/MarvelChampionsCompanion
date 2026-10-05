import type { GameState } from "../domain/types.ts";
import type { GameEvent } from "../events/types.ts";
export function resolveImTough(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  if (state.villain.tough) {
    events.push({ type: "CARD_GAINED_SURGE", cardName: '"¡Soy duro!"' });
    return { state, events };
  }
  events.push({ type: "STATUS_GAINED", targetId: "villain", status: "TOUGH" });
  return {
    state: { ...state, villain: { ...state.villain, tough: true } },
    events,
  };
}
export function resolveHardToKeepDown(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  const missingHealth = state.villain.maxHealth - state.villain.health;
  if (missingHealth <= 0) {
    events.push({ type: "CARD_GAINED_SURGE", cardName: "Difícil de tumbar" });
    return { state, events };
  }
  const healed = Math.min(4, missingHealth);
  events.push({
    type: "HEALTH_HEALED",
    targetId: "villain",
    amount: healed,
    source: "Difícil de tumbar",
  });
  return {
    state: {
      ...state,
      villain: { ...state.villain, health: state.villain.health + healed },
    },
    events,
  };
}
export function resolveStampede(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const player = state.players.find((p) => p.id === playerId)!;
  if (player.form === "ALTER_EGO") {
    events.push({ type: "CARD_GAINED_SURGE", cardName: "Estampida" });
    return { state, events };
  }
  const amount = state.villain.attack;
  const newHealth = Math.max(0, player.health - amount);
  events.push({ type: "VILLAIN_ATTACKED", playerId, amount });
  const damaged = newHealth < player.health;
  const newPlayers = state.players.map((p) =>
    p.id === playerId
      ? { ...p, health: newHealth, stunned: damaged ? true : p.stunned }
      : p,
  );
  if (damaged) {
    events.push({
      type: "STATUS_GAINED",
      targetId: playerId,
      status: "STUNNED",
    });
  }
  return { state: { ...state, players: newPlayers }, events };
}

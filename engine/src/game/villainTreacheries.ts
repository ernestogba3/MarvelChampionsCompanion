import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
export function resolveImTough(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  if (state.villain.tough) {
    return applyEffects(state, [
      { type: "GAIN_SURGE", cardName: '"¡Soy duro!"' },
    ]);
  }
  return applyEffects(state, [
    { type: "GAIN_STATUS", target: { kind: "VILLAIN" }, status: "TOUGH" },
  ]);
}
export function resolveHardToKeepDown(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const missingHealth = state.villain.maxHealth - state.villain.health;
  if (missingHealth <= 0) {
    return applyEffects(state, [
      { type: "GAIN_SURGE", cardName: "Difícil de tumbar" },
    ]);
  }
  return applyEffects(state, [
    {
      type: "HEAL",
      target: { kind: "VILLAIN" },
      amount: 4,
      source: "Difícil de tumbar",
    },
  ]);
}
export function resolveStampede(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId)!;
  if (player.form === "ALTER_EGO") {
    return applyEffects(state, [{ type: "GAIN_SURGE", cardName: "Estampida" }]);
  }
  const healthBefore = player.health;
  const amount = state.villain.attack;
  const { state: afterDamage, events: damageEvents } = applyEffects(state, [
    {
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId },
      amount,
      source: "Estampida",
    },
  ]);
  const semanticEvents: GameEvent[] = [
    { type: "VILLAIN_ATTACKED", playerId, amount },
    ...damageEvents,
  ];
  const damaged =
    afterDamage.players.find((p) => p.id === playerId)!.health < healthBefore;
  if (!damaged) {
    return { state: afterDamage, events: semanticEvents };
  }
  const { state: finalState, events: stunEvents } = applyEffects(afterDamage, [
    {
      type: "GAIN_STATUS",
      target: { kind: "PLAYER", playerId },
      status: "STUNNED",
    },
  ]);
  return { state: finalState, events: [...semanticEvents, ...stunEvents] };
}

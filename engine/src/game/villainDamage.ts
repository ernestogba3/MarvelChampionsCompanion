import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffect } from "../effects/applyEffect";
export function dealDamageToVillain(
  state: GameState,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  return applyEffect(state, {
    type: "DEAL_DAMAGE",
    target: { kind: "VILLAIN" },
    amount,
    source: "player",
  });
}
export function getVillainAttackBonus(state: GameState): number {
  return state.villain.attachments.reduce((sum, a) => sum + a.attackBonus, 0);
}
export function consumeOneShotAttackAttachments(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  const toDiscard = state.villain.attachments.filter(
    (a) => a.discardAfterAttack,
  );
  for (const a of toDiscard) {
    events.push({ type: "ATTACHMENT_DISCARDED", attachmentId: a.id });
  }
  const attachments = state.villain.attachments.filter(
    (a) => !a.discardAfterAttack,
  );
  return {
    state: { ...state, villain: { ...state.villain, attachments } },
    events,
  };
}
export function resolveChargeAttack(state: GameState): {
  state: GameState;
  events: GameEvent[];
  attackBonus: number;
} {
  const attackBonus = getVillainAttackBonus(state);
  const { state: afterConsume, events } =
    consumeOneShotAttackAttachments(state);
  return { state: afterConsume, events, attackBonus };
}

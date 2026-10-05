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
export function resolveChargeAttack(state: GameState): {
  state: GameState;
  events: GameEvent[];
  attackBonus: number;
} {
  const events: GameEvent[] = [];
  const charge = state.villain.attachments.find((a) => a.name === "Embestida");
  const attackBonus = charge ? 3 : 0;
  let attachments = state.villain.attachments;
  if (charge) {
    events.push({ type: "ATTACHMENT_DISCARDED", attachmentId: charge.id });
    attachments = attachments.filter((a) => a.id !== charge.id);
  }
  return {
    state: { ...state, villain: { ...state.villain, attachments } },
    events,
    attackBonus,
  };
}

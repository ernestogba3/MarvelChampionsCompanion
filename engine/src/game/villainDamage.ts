import type { GameState, VillainState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffect } from "../effects/applyEffect";
import { discardEncounterCard } from "./encounterDeck";
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
/** +ATQ de las acopladas de un villano (Embestida +3, Cuerno de marfil +1). */
export function attachmentAttackBonus(villain: VillainState): number {
  return villain.attachments.reduce((sum, a) => sum + a.attackBonus, 0);
}
export function getVillainAttackBonus(state: GameState): number {
  return attachmentAttackBonus(state.villain);
}
/**
 * ATQ del villano activo en un ataque: el impreso más el de sus acopladas.
 * Para los traicioneros que dicen "el villano te ataca" (Agresión, Todos a
 * una, Estampida); la activación normal usa villainAttacks.
 */
export function activeVillainAttack(state: GameState): number {
  return state.villain.attack + getVillainAttackBonus(state);
}
/**
 * Descarta las acopladas que se gastan al atacar (Embestida: "al final de
 * este ataque, descarta la Embestida"). Se llama tras cada ataque del
 * villano activo.
 */
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
  let next: GameState = {
    ...state,
    villain: { ...state.villain, attachments },
  };
  for (const a of toDiscard) {
    next = discardEncounterCard(next, a.cardId);
  }
  return { state: next, events };
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

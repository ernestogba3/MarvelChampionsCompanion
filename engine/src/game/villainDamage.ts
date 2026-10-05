import type { GameState } from '../domain/types.js';
import type { GameEvent } from '../events/types.js';

type VillainAttachment = {
  id: string;
  name: string;
  damageAbsorbed?: number;
};

export function dealDamageToVillain(
  state: GameState,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const attachments = state.villain.attachments as VillainAttachment[];
  const suit = attachments.find((a) => a.name === 'Piel blindada del Rino');

  if (suit) {
    const newDamage = (suit.damageAbsorbed ?? 0) + amount;
    events.push({ type: 'DAMAGE_REDIRECTED', toAttachmentId: suit.id, amount });

    let villainAttachments = attachments.map((a) =>
      a.id === suit.id ? { ...a, damageAbsorbed: newDamage } : a,
    );

    if (newDamage >= 5) {
      events.push({ type: 'ATTACHMENT_DISCARDED', attachmentId: suit.id });
      villainAttachments = villainAttachments.filter((a) => a.id !== suit.id);
    }

    return {
      state: {
        ...state,
        villain: { ...state.villain, attachments: villainAttachments },
      },
      events,
    };
  }

  const newHealth = Math.max(0, state.villain.health - amount);
  events.push({ type: 'DAMAGE_DEALT', targetId: 'villain', amount, source: 'player' });

  return {
    state: {
      ...state,
      villain: { ...state.villain, health: newHealth },
    },
    events,
  };
}

export function resolveChargeAttack(
  state: GameState,
): { state: GameState; events: GameEvent[]; attackBonus: number } {
  const events: GameEvent[] = [];
  const attachments = state.villain.attachments as VillainAttachment[];
  const charge = attachments.find((a) => a.name === 'Embestida');
  const attackBonus = charge ? 3 : 0;

  let villainAttachments = attachments;

  if (charge) {
    events.push({ type: 'ATTACHMENT_DISCARDED', attachmentId: charge.id });
    villainAttachments = villainAttachments.filter((a) => a.id !== charge.id);
  }

  return {
    state: {
      ...state,
      villain: { ...state.villain, attachments: villainAttachments },
    },
    events,
    attackBonus,
  };
}

// Nota: el "overkill" (repartir el exceso de daño al controlador de un
// aliado) queda pendiente para cuando exista el concepto de aliados
// en el motor — fuera del alcance del modelo compañero actual.
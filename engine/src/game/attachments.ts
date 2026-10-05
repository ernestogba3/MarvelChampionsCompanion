import type { VillainAttachmentState } from "../domain/types";
export function createArmoredRhinoSuit(id: string): VillainAttachmentState {
  return {
    id,
    cardId: "01098",
    name: "Piel blindada del Rino",
    damageAbsorbed: 0,
    active: true,
    redirectsDamage: true,
    damageCapacity: 5,
    attackBonus: 0,
    discardAfterAttack: false,
  };
}
export function createCharge(id: string): VillainAttachmentState {
  return {
    id,
    cardId: "01099",
    name: "Embestida",
    damageAbsorbed: 0,
    active: true,
    redirectsDamage: false,
    damageCapacity: 0,
    attackBonus: 3,
    discardAfterAttack: true,
  };
}
export function createEnhancedIvoryHorn(id: string): VillainAttachmentState {
  return {
    id,
    cardId: "01100",
    name: "Cuerno de marfil mejorado",
    damageAbsorbed: 0,
    active: true,
    redirectsDamage: false,
    damageCapacity: 0,
    attackBonus: 1,
    discardAfterAttack: false,
  };
}

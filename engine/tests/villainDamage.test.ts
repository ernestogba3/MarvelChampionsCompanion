import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import {
  dealDamageToVillain,
  resolveChargeAttack,
} from "../src/game/villainDamage";
import { createArmoredRhinoSuit, createCharge } from "../src/game/attachments";
describe("TC-023 y TC-024: Piel blindada del Rino", () => {
  it("TC-023: absorbe el daño en vez de aplicarlo a la vida de Rino", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      villain: {
        ...base.villain,
        attachments: [createArmoredRhinoSuit("suit-1")],
      },
    };
    const { state: after, events } = dealDamageToVillain(state, 3);
    expect(after.villain.health).toBe(14);
    expect(after.villain.attachments[0]!.damageAbsorbed).toBe(3);
    expect(events).toContainEqual({
      type: "DAMAGE_REDIRECTED",
      toAttachmentId: "suit-1",
      amount: 3,
    });
  });
  it("TC-024: se descarta al acumular 5 o más de daño", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const suit = { ...createArmoredRhinoSuit("suit-1"), damageAbsorbed: 3 };
    const state = {
      ...base,
      villain: { ...base.villain, attachments: [suit] },
    };
    const { state: after, events } = dealDamageToVillain(state, 2);
    expect(after.villain.attachments).toHaveLength(0);
    expect(events).toContainEqual({
      type: "ATTACHMENT_DISCARDED",
      attachmentId: "suit-1",
    });
  });
});
describe("TC-025: Embestida", () => {
  it("aumenta el ataque en +3 y se descarta tras usarse", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      villain: { ...base.villain, attachments: [createCharge("charge-1")] },
    };
    const { state: after, attackBonus, events } = resolveChargeAttack(state);
    expect(attackBonus).toBe(3);
    expect(after.villain.attachments).toHaveLength(0);
    expect(events).toContainEqual({
      type: "ATTACHMENT_DISCARDED",
      attachmentId: "charge-1",
    });
  });
});

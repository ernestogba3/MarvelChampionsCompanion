import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import {
  dealDamageToVillain,
  resolveChargeAttack,
} from "../src/game/villainDamage";
import {
  createArmoredRhinoSuit,
  createCharge,
  createEnhancedIvoryHorn,
} from "../src/game/attachments";
import { resolveVillainActivation } from "../src/game/villainActivation";
import { resolveAssault, resolveGangUp } from "../src/game/standardSet";
import { resolveStampede } from "../src/game/villainTreacheries";
import type { GameState, VillainAttachmentState } from "../src/domain/types";
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

// Las acopladas suman ATQ en TODOS los ataques del villano (activación y
// traicioneros "el villano te ataca"), y Embestida se descarta al final del
// ataque (01099: "al final de este ataque, descarta la Embestida"). Sin
// cartas en el mazo de encuentros para que no haya aumento: Rino I tiene 2
// de ATQ y Spider-Man 10 PG.
describe("ATQ de las acopladas de Rino en sus ataques", () => {
  function heroWith(attachments: VillainAttachmentState[]): GameState {
    const base = createSpiderManVsRhinoGame("player-1");
    return {
      ...base,
      encounterDeck: [],
      encounterDiscard: [],
      players: base.players.map((p) => ({ ...p, form: "HERO" as const })),
      villain: { ...base.villain, attachments },
    };
  }
  const health = (s: GameState) => s.players[0]!.health;

  it("Cuerno de marfil: +1 ATQ en la activación y se queda", () => {
    const state = heroWith([createEnhancedIvoryHorn("horn-1")]);
    const { state: after } = resolveVillainActivation(state, "player-1");
    expect(health(after)).toBe(10 - 3);
    expect(after.villain.attachments.map((a) => a.cardId)).toEqual(["01100"]);
  });

  it("Embestida: +3 ATQ en la activación y se descarta al final del ataque", () => {
    const state = heroWith([createCharge("charge-1")]);
    const { state: after, events } = resolveVillainActivation(
      state,
      "player-1",
    );
    expect(health(after)).toBe(10 - 5);
    expect(events).toContainEqual({
      type: "VILLAIN_ATTACKED",
      playerId: "player-1",
      amount: 5,
    });
    expect(after.villain.attachments).toHaveLength(0);
    expect(after.encounterDiscard).toEqual(["01099"]);
  });

  it("las dos a la vez suman +4; solo se descarta Embestida", () => {
    const state = heroWith([
      createCharge("charge-1"),
      createEnhancedIvoryHorn("horn-1"),
    ]);
    const { state: after } = resolveVillainActivation(state, "player-1");
    expect(health(after)).toBe(10 - 6);
    expect(after.villain.attachments.map((a) => a.cardId)).toEqual(["01100"]);
  });

  it("en alter ego el villano maquina: Embestida no se gasta", () => {
    const base = heroWith([createCharge("charge-1")]);
    const state: GameState = {
      ...base,
      players: base.players.map((p) => ({ ...p, form: "ALTER_EGO" as const })),
    };
    const { state: after } = resolveVillainActivation(state, "player-1");
    expect(health(after)).toBe(10);
    expect(after.villain.attachments).toHaveLength(1);
  });

  it("Agresión: el ataque suma las acopladas y gasta Embestida", () => {
    const state = heroWith([createCharge("charge-1")]);
    const { state: after } = resolveAssault(state, "player-1");
    expect(health(after)).toBe(10 - 5);
    expect(after.villain.attachments).toHaveLength(0);
    expect(after.encounterDiscard).toEqual(["01099"]);
  });

  it("Todos a una: el ataque del villano suma las acopladas", () => {
    const state = heroWith([createEnhancedIvoryHorn("horn-1")]);
    const { state: after, events } = resolveGangUp(state, "player-1");
    expect(health(after)).toBe(10 - 3);
    expect(events).toContainEqual({
      type: "VILLAIN_ATTACKED",
      playerId: "player-1",
      amount: 3,
    });
  });

  it("Estampida: el ataque suma las acopladas y gasta Embestida", () => {
    const state = heroWith([createCharge("charge-1")]);
    const { state: after } = resolveStampede(state, "player-1");
    expect(health(after)).toBe(10 - 5);
    expect(after.villain.attachments).toHaveLength(0);
    expect(after.players[0]!.stunned).toBe(true);
  });
});

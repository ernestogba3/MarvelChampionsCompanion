import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import {
  advanceToRhinoStageTwo,
  advanceToRhinoStageThree,
} from "../src/game/villainStages";
import { attackVillain, checkGameOutcome } from "../src/game/playerActions";

describe("villain stages", () => {
  it("Standard arranca en Rino I con vida 14 y guarda la dificultad", () => {
    const state = createSpiderManVsRhinoGame("player-1", "STANDARD");
    expect(state.difficulty).toBe("STANDARD");
    expect(state.villain.stage).toBe("I");
    expect(state.villain.health).toBe(14);
    expect(state.villain.attack).toBe(2);
    expect(state.schemes).toHaveLength(1);
  });

  it("Expert arranca en Rino II con vida 15 y Arramblar con todo en juego", () => {
    const state = createSpiderManVsRhinoGame("player-1", "EXPERT");
    expect(state.difficulty).toBe("EXPERT");
    expect(state.villain.stage).toBe("II");
    expect(state.villain.health).toBe(15);
    expect(state.villain.attack).toBe(3);
    expect(state.schemes.some((s) => s.name === "Arramblar con todo")).toBe(
      true,
    );
  });

  it("advanceToRhinoStageThree pone vida 16, ATQ 4, tough y aturde al héroe", () => {
    const base = createSpiderManVsRhinoGame("player-1", "EXPERT");
    const { state: after, events } = advanceToRhinoStageThree(base);
    expect(after.villain.stage).toBe("III");
    expect(after.villain.health).toBe(16);
    expect(after.villain.maxHealth).toBe(16);
    expect(after.villain.attack).toBe(4);
    expect(after.villain.tough).toBe(true);
    expect(after.players[0].stunned).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "VILLAIN_STAGE_CHANGED",
        from: "II",
        to: "III",
      }),
    );
  });

  it("Standard: matar a Rino II gana la partida (no pasa a III)", () => {
    const base = createSpiderManVsRhinoGame("player-1", "STANDARD");
    // Mato a Rino I, pasa a II
    const atII = attackVillain(base, "player-1", 14).state;
    expect(atII.villain.stage).toBe("II");
    // Mato a Rino II
    const { state: afterKillII } = attackVillain(atII, "player-1", 15);
    expect(afterKillII.villain.stage).toBe("II");
    expect(afterKillII.villain.health).toBe(0);
    expect(checkGameOutcome(afterKillII)).toBe("WIN");
  });

  it("Expert: matar a Rino II pasa a III y NO gana", () => {
    const base = createSpiderManVsRhinoGame("player-1", "EXPERT");
    const { state: after } = attackVillain(base, "player-1", 15);
    expect(after.villain.stage).toBe("III");
    expect(after.villain.health).toBe(16);
    expect(checkGameOutcome(after)).toBe("ONGOING");
  });

  it("Expert: matar a Rino III gana la partida", () => {
    const base = createSpiderManVsRhinoGame("player-1", "EXPERT");
    const atIII = advanceToRhinoStageThree(base).state;
    // Primer golpe consume tough (Dureza)
    const afterFirst = attackVillain(atIII, "player-1", 5).state;
    expect(afterFirst.villain.tough).toBe(false);
    // Golpe final
    const { state: afterKill } = attackVillain(afterFirst, "player-1", 16);
    expect(afterKill.villain.stage).toBe("III");
    expect(afterKill.villain.health).toBe(0);
    expect(checkGameOutcome(afterKill)).toBe("WIN");
  });

  it("Standard: checkGameOutcome NO gana en estadio III con vida 0", () => {
    const base = createSpiderManVsRhinoGame("player-1", "STANDARD");
    const forced = {
      ...base,
      villain: { ...base.villain, stage: "III" as const, health: 0 },
    };
    expect(checkGameOutcome(forced)).toBe("ONGOING");
  });
});

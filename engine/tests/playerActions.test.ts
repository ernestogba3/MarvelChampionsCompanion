import { describe, it, expect } from "vitest";
import {
  createSpiderManVsRhinoGame,
  createRhinoGame,
} from "../src/game/createGame";
import { attackVillain, checkGameOutcome } from "../src/game/playerActions";

describe("createRhinoGame — escalado por número de jugadores", () => {
  it("1 jugador: PG de Rino (I) y umbral del plan principal igual que antes (14 / 7)", () => {
    const state = createRhinoGame([
      {
        id: "player-1",
        heroName: "Spider-Man",
        alterEgoName: "Peter Parker",
        health: 10,
      },
    ]);
    expect(state.villain.health).toBe(14);
    const mainScheme = state.schemes.find((s) => s.isMain)!;
    expect(mainScheme.threatToComplete).toBe(7);
  });

  it("2 jugadores: PG de Rino (I) y umbral del plan principal se duplican (28 / 14)", () => {
    const state = createRhinoGame([
      {
        id: "player-1",
        heroName: "Spider-Man",
        alterEgoName: "Peter Parker",
        health: 10,
      },
      {
        id: "player-2",
        heroName: "Iron Man",
        alterEgoName: "Tony Stark",
        health: 10,
      },
    ]);
    expect(state.villain.health).toBe(28);
    expect(state.villain.maxHealth).toBe(28);
    const mainScheme = state.schemes.find((s) => s.isMain)!;
    expect(mainScheme.threatToComplete).toBe(14);
  });

  it("4 jugadores: PG de Rino (I) y umbral del plan principal ×4 (56 / 28)", () => {
    const state = createRhinoGame([
      { id: "p1", heroName: "H1", alterEgoName: "A1", health: 10 },
      { id: "p2", heroName: "H2", alterEgoName: "A2", health: 10 },
      { id: "p3", heroName: "H3", alterEgoName: "A3", health: 10 },
      { id: "p4", heroName: "H4", alterEgoName: "A4", health: 10 },
    ]);
    expect(state.villain.health).toBe(56);
    const mainScheme = state.schemes.find((s) => s.isMain)!;
    expect(mainScheme.threatToComplete).toBe(28);
  });

  it("la vida de cada jugador NO escala: es la de su propia carta de identidad", () => {
    const state = createRhinoGame([
      {
        id: "player-1",
        heroName: "Spider-Man",
        alterEgoName: "Peter Parker",
        health: 10,
      },
      {
        id: "player-2",
        heroName: "Iron Man",
        alterEgoName: "Tony Stark",
        health: 42,
      },
    ]);
    expect(state.players[0]!.health).toBe(10);
    expect(state.players[1]!.health).toBe(42);
  });

  it("amenaza inicial del plan principal se mantiene fija en 0 sea cual sea el nº de jugadores", () => {
    const state = createRhinoGame([
      {
        id: "player-1",
        heroName: "Spider-Man",
        alterEgoName: "Peter Parker",
        health: 10,
      },
      {
        id: "player-2",
        heroName: "Iron Man",
        alterEgoName: "Tony Stark",
        health: 10,
      },
      { id: "player-3", heroName: "Cap", alterEgoName: "Steve", health: 10 },
    ]);
    const mainScheme = state.schemes.find((s) => s.isMain)!;
    expect(mainScheme.threat).toBe(0);
  });
});

describe("attackVillain", () => {
  it("inflige daño normal si Rino queda con vida", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = attackVillain(state, "player-1", 5);
    expect(after.villain.health).toBe(9);
    expect(after.villain.stage).toBe("I");
  });

  it("pasa a Rino (II) si la etapa I queda a 0 o menos", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = attackVillain(state, "player-1", 20);
    expect(after.villain.stage).toBe("II");
    expect(after.villain.health).toBe(15);
  });

  it("al pasar de etapa con 2 jugadores, los PG de la nueva etapa también escalan (×2 = 30)", () => {
    const base = createRhinoGame([
      {
        id: "player-1",
        heroName: "Spider-Man",
        alterEgoName: "Peter Parker",
        health: 10,
      },
      {
        id: "player-2",
        heroName: "Iron Man",
        alterEgoName: "Tony Stark",
        health: 10,
      },
    ]);
    const { state: after } = attackVillain(base, "player-1", 100);
    expect(after.villain.stage).toBe("II");
    expect(after.villain.health).toBe(30);
  });

  it("se puede atacar a Rino si no hay ningún esbirro con guardia (aunque haya otros esbirros)", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      minions: [
        {
          id: "m2",
          cardId: "01102",
          name: "Hombre de Arena",
          attack: 3,
          scheme: 2,
          health: 4,
          maxHealth: 4,
          engagedWith: "player-1",
          tough: true,
          guard: false,
        },
      ],
    };
    const { state: after } = attackVillain(state, "player-1", 5);
    expect(after.villain.health).toBe(9);
  });

  it("no se puede atacar a Rino si hay un esbirro con guardia enfrentado con quien ataca", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      minions: [
        {
          id: "m1",
          cardId: "01101",
          name: "Mercenario de Hydra",
          attack: 1,
          scheme: 0,
          health: 3,
          maxHealth: 3,
          engagedWith: "player-1",
          tough: false,
          guard: true,
        },
      ],
    };
    const { state: after, events } = attackVillain(state, "player-1", 5);
    expect(after.villain.health).toBe(14);
    expect(events).toContainEqual({
      type: "ATTACK_BLOCKED_BY_GUARD",
      minionId: "m1",
      minionName: "Mercenario de Hydra",
    });
  });

  it("Guardia solo bloquea al jugador enganchado con ese esbirro, no a otros jugadores", () => {
    const base = createRhinoGame([
      {
        id: "player-1",
        heroName: "Spider-Man",
        alterEgoName: "Peter Parker",
        health: 10,
      },
      {
        id: "player-2",
        heroName: "Iron Man",
        alterEgoName: "Tony Stark",
        health: 10,
      },
    ]);
    const state = {
      ...base,
      minions: [
        {
          id: "m1",
          cardId: "01101",
          name: "Mercenario de Hydra",
          attack: 1,
          scheme: 0,
          health: 3,
          maxHealth: 3,
          engagedWith: "player-1",
          tough: false,
          guard: true,
        },
      ],
    };

    const blockedForPlayer1 = attackVillain(state, "player-1", 5);
    expect(blockedForPlayer1.events).toContainEqual({
      type: "ATTACK_BLOCKED_BY_GUARD",
      minionId: "m1",
      minionName: "Mercenario de Hydra",
    });
    expect(blockedForPlayer1.state.villain.health).toBe(base.villain.health);

    const allowedForPlayer2 = attackVillain(state, "player-2", 5);
    expect(allowedForPlayer2.state.villain.health).toBe(
      base.villain.health - 5,
    );
  });

  it("si el villano tiene Tough, el ataque no le hace nada de daño y se descarta el Tough", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, villain: { ...base.villain, tough: true } };
    const { state: after, events } = attackVillain(state, "player-1", 5);
    expect(after.villain.health).toBe(14);
    expect(after.villain.tough).toBe(false);
    expect(events).toContainEqual({
      type: "STATUS_REMOVED",
      targetId: "villain",
      status: "TOUGH",
    });
  });

  it("una vez gastado el Tough del villano, el siguiente ataque vuelve a hacer daño normal", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const toughState = { ...base, villain: { ...base.villain, tough: true } };
    const { state: afterTough } = attackVillain(toughState, "player-1", 5);
    const { state: afterSecondAttack } = attackVillain(
      afterTough,
      "player-1",
      5,
    );
    expect(afterSecondAttack.villain.health).toBe(9);
  });
});

describe("checkGameOutcome", () => {
  it("ONGOING por defecto", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    expect(checkGameOutcome(state)).toBe("ONGOING");
  });

  it("LOSS si la amenaza del plan principal llega a su umbral", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = { ...base, schemes: [{ ...base.schemes[0]!, threat: 7 }] };
    expect(checkGameOutcome(state)).toBe("LOSS");
  });

  it("WIN si Rino (II) queda a 0 de vida", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      villain: { ...base.villain, stage: "II" as const, health: 0 },
    };
    expect(checkGameOutcome(state)).toBe("WIN");
  });
});

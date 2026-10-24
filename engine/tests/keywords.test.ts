import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import { attackVillain, attackMinion } from "../src/game/playerActions";
import { revealPendingCardsForPlayer } from "../src/game/revealEncounterCards";
import type { GameState, MinionState } from "../src/domain/types";
import type { PlayerSetup } from "../src/game/createGame";

const P1: PlayerSetup[] = [
  {
    id: "player-1",
    heroName: "Spider-Man",
    alterEgoName: "Peter Parker",
    health: 10,
  },
];

function makeMinion(overrides: Partial<MinionState> = {}): MinionState {
  return {
    id: "m1",
    cardId: "01120",
    name: "Guardia acorazado",
    attack: 1,
    scheme: 0,
    health: 3,
    maxHealth: 3,
    engagedWith: null,
    tough: false,
    guard: false,
    ...overrides,
  };
}

describe("Oleada (Surge) — revelado de carta de encuentro", () => {
  it("emite CARD_GAINED_SURGE al revelar Weapons Runner (Oleada impresa)", () => {
    const base = createGame("klaw", P1, "STANDARD");
    const withFaceDown: GameState = {
      ...base,
      players: base.players.map((p) =>
        p.id === "player-1" ? { ...p, faceDownEncounterCards: ["01121"] } : p,
      ),
    };
    const { events } = revealPendingCardsForPlayer(withFaceDown, "player-1");
    const surges = events.filter((e) => e.type === "CARD_GAINED_SURGE");
    expect(surges).toHaveLength(1);
  });

  it("NO emite Oleada para una carta sin la keyword impresa", () => {
    const base = createGame("klaw", P1, "STANDARD");
    // 01122 (La venganza de Klaw): no lleva Oleada impresa.
    const withFaceDown: GameState = {
      ...base,
      players: base.players.map((p) =>
        p.id === "player-1" ? { ...p, faceDownEncounterCards: ["01122"] } : p,
      ),
    };
    const { events } = revealPendingCardsForPlayer(withFaceDown, "player-1");
    expect(events.filter((e) => e.type === "CARD_GAINED_SURGE")).toHaveLength(
      0,
    );
  });
});

describe("Represalia (Retaliate) — villano", () => {
  it("devuelve N de daño al atacante al golpear a un villano con Represalia", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const withRetaliate: GameState = {
      ...base,
      villain: { ...base.villain, retaliate: 2 },
    };
    const { state, events } = attackVillain(withRetaliate, "player-1", 3);
    expect(state.villain.health).toBe(11); // 14 - 3
    expect(state.players[0]!.health).toBe(8); // 10 - 2 de Represalia
    expect(events).toContainEqual({
      type: "DAMAGE_DEALT",
      targetId: "player-1",
      amount: 2,
      source: "retaliate",
    });
  });

  it("no hay Represalia si el villano no la lleva", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const { state, events } = attackVillain(base, "player-1", 3);
    expect(state.players[0]!.health).toBe(10);
    expect(
      events.some((e) => e.type === "DAMAGE_DEALT" && e.source === "retaliate"),
    ).toBe(false);
  });

  it("la Represalia se aplica aunque el ataque derrote al villano (y avance de estadio)", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const lowHp: GameState = {
      ...base,
      villain: { ...base.villain, health: 2, retaliate: 2 },
    };
    const { state } = attackVillain(lowHp, "player-1", 5);
    expect(state.villain.stage).toBe("II"); // avanzó al derrotar a I
    expect(state.players[0]!.health).toBe(8); // recibió la Represalia igualmente
  });

  it("Resistente absorbe el golpe sin daño → no hay Represalia", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const toughWithRetaliate: GameState = {
      ...base,
      villain: { ...base.villain, tough: true, retaliate: 2 },
    };
    const { state, events } = attackVillain(toughWithRetaliate, "player-1", 3);
    expect(state.players[0]!.health).toBe(10); // sin Represalia (no hubo daño)
    expect(
      events.some((e) => e.type === "DAMAGE_DEALT" && e.source === "retaliate"),
    ).toBe(false);
  });
});

describe("Represalia (Retaliate) — esbirro", () => {
  it("devuelve daño al atacante cuando se pasa el atacante", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const withMinion: GameState = {
      ...base,
      minions: [makeMinion({ retaliate: 2 })],
    };
    const { state, events } = attackMinion(withMinion, "m1", 1, "player-1");
    expect(state.minions[0]!.health).toBe(2); // 3 - 1
    expect(state.players[0]!.health).toBe(8); // 10 - 2 de Represalia
    expect(events).toContainEqual({
      type: "DAMAGE_DEALT",
      targetId: "player-1",
      amount: 2,
      source: "retaliate",
    });
  });

  it("sin atacante (firma antigua) no se aplica Represalia", () => {
    const base = createGame("rhino", P1, "STANDARD");
    const withMinion: GameState = {
      ...base,
      minions: [makeMinion({ retaliate: 2 })],
    };
    const { state } = attackMinion(withMinion, "m1", 1);
    expect(state.players[0]!.health).toBe(10); // sin cambios
  });
});

import { describe, it, expect } from "vitest";
import { createGame } from "../src/game/createGame";
import type { PlayerSetup } from "../src/game/createGame";
import { putCardIntoPlay } from "../src/game/putCardIntoPlay";
import { revealPendingCardsForPlayer } from "../src/game/revealEncounterCards";
import {
  attackMinion,
  attackVillain,
  thwartScheme,
} from "../src/game/playerActions";
import { setActiveVillain } from "../src/game/multiVillain";
import { dealPendingEncounterCards } from "../src/game/dealEncounterCards";
import type { GameState } from "../src/domain/types";

// Una carta de encuentro que se queda en juego (esbirro, plan secundario,
// acoplada modelada) no está en el descarte: va a él cuando sale de juego.
// Si no, al rebarajar el descarte volvería al mazo mientras sigue en mesa.

const P1: PlayerSetup[] = [
  {
    id: "player-1",
    heroName: "Spider-Man",
    alterEgoName: "Peter Parker",
    health: 10,
  },
];

function reveal(state: GameState, cardId: string): GameState {
  const dealt: GameState = {
    ...state,
    players: state.players.map((p) =>
      p.id === "player-1" ? { ...p, faceDownEncounterCards: [cardId] } : p,
    ),
  };
  return revealPendingCardsForPlayer(dealt, "player-1").state;
}

/** Ataca al esbirro hasta derrotarlo (el primer golpe puede gastar Resistente). */
function defeatMinion(state: GameState, minionId: string): GameState {
  let current = state;
  for (let i = 0; i < 3; i++) {
    if (!current.minions.some((m) => m.id === minionId)) break;
    current = attackMinion(current, minionId, 99).state;
  }
  return current;
}

describe("Cartas de encuentro en juego y descarte", () => {
  it("un esbirro revelado entra en juego y no va al descarte", () => {
    const after = reveal(createGame("rhino", P1), "01102");
    expect(after.minions.map((m) => m.cardId)).toEqual(["01102"]);
    expect(after.encounterDiscard).not.toContain("01102");
  });

  it("un plan secundario revelado entra en juego y no va al descarte", () => {
    const after = reveal(createGame("rhino", P1), "01108");
    expect(after.schemes.some((s) => s.cardId === "01108")).toBe(true);
    expect(after.encounterDiscard).not.toContain("01108");
  });

  it("una acoplada modelada (Piel blindada) se acopla y no va al descarte", () => {
    const after = reveal(createGame("rhino", P1), "01098");
    expect(after.villain.attachments.map((a) => a.cardId)).toEqual(["01098"]);
    expect(after.encounterDiscard).not.toContain("01098");
  });

  it("una acoplada sin modelar se juega a mano y va al descarte", () => {
    const after = reveal(createGame("klaw", P1), "01118");
    expect(after.villain.attachments).toHaveLength(0);
    expect(after.encounterDiscard).toContain("01118");
  });

  it("un traicionero revelado va al descarte", () => {
    const after = reveal(createGame("rhino", P1), "01104");
    expect(after.encounterDiscard).toContain("01104");
  });

  it("al derrotar a un esbirro, su carta va al descarte", () => {
    const inPlay = reveal(createGame("rhino", P1), "01102");
    const minionId = inPlay.minions[0]!.id;
    const after = defeatMinion(inPlay, minionId);
    expect(after.minions).toHaveLength(0);
    expect(after.encounterDiscard).toEqual(["01102"]);
  });

  it("al quitar toda la amenaza de un plan secundario, su carta va al descarte", () => {
    const inPlay = reveal(createGame("rhino", P1), "01108");
    const scheme = inPlay.schemes.find((s) => s.cardId === "01108")!;
    const after = thwartScheme(inPlay, scheme.id, 99).state;
    expect(after.schemes.some((s) => s.cardId === "01108")).toBe(false);
    expect(after.encounterDiscard).toEqual(["01108"]);
  });

  it("al romperse la Piel blindada, su carta va al descarte", () => {
    const inPlay = putCardIntoPlay(createGame("rhino", P1), "01098", "player-1")
      .state;
    const after = attackVillain(inPlay, "player-1", 5).state;
    expect(after.villain.attachments).toHaveLength(0);
    expect(after.encounterDiscard).toEqual(["01098"]);
  });

  it("al rebarajar, un esbirro en juego no vuelve al mazo", () => {
    const inPlay = reveal(createGame("rhino", P1), "01102");
    const exhausted: GameState = {
      ...inPlay,
      encounterDeck: [],
      encounterDiscard: [...inPlay.encounterDiscard, "01104"],
      pendingEncounterDeals: ["player-1"],
    };
    // Repartir con el mazo vacío rebaraja el descarte: solo vuelve el
    // traicionero, que es la carta repartida.
    const dealt = dealPendingEncounterCards(exhausted).state;
    expect(dealt.players[0]!.faceDownEncounterCards).toEqual(["01104"]);
    expect([...dealt.encounterDeck, ...dealt.encounterDiscard]).not.toContain(
      "01102",
    );
    expect(dealt.minions.map((m) => m.cardId)).toEqual(["01102"]);
  });
});

describe("Rino II: Arramblar con todo sale del mazo", () => {
  it("al pasar a II, el plan entra en juego y su carta sale del mazo", () => {
    const base = createGame("rhino", P1);
    expect(base.encounterDeck.filter((c) => c === "01107")).toHaveLength(1);
    const after = attackVillain(base, "player-1", 14).state;
    expect(after.villain.stage).toBe("II");
    expect(after.schemes.some((s) => s.cardId === "01107")).toBe(true);
    expect(after.encounterDeck).not.toContain("01107");
    expect(after.encounterDiscard).not.toContain("01107");
  });

  it("también la busca en el descarte", () => {
    const base = createGame("rhino", P1);
    const inDiscard: GameState = {
      ...base,
      encounterDeck: base.encounterDeck.filter((c) => c !== "01107"),
      encounterDiscard: ["01107"],
    };
    const after = attackVillain(inDiscard, "player-1", 14).state;
    expect(after.encounterDiscard).not.toContain("01107");
    expect(after.schemes.some((s) => s.cardId === "01107")).toBe(true);
  });

  it("en Experto (empieza en II) el plan está en juego y no en el mazo", () => {
    const state = createGame("rhino", P1, "EXPERT");
    expect(state.schemes.some((s) => s.cardId === "01107")).toBe(true);
    expect(state.encounterDeck).not.toContain("01107");
  });

  it("al derrotarse el plan, su carta va al descarte", () => {
    const state = createGame("rhino", P1, "EXPERT");
    const scheme = state.schemes.find((s) => s.cardId === "01107")!;
    const after = thwartScheme(state, scheme.id, 99).state;
    expect(after.encounterDiscard).toEqual(["01107"]);
  });
});

describe("The Wrecking Crew: cada carta al descarte de su villano", () => {
  it("un esbirro de Destructor derrotado con otro villano activo va al descarte de Destructor", () => {
    const base = createGame("wrecking-crew", P1);
    const withGuard = putCardIntoPlay(base, "07008", "player-1").state;
    const minionId = withGuard.minions[0]!.id;
    const swapped = setActiveVillain(withGuard, "thunderball").state;
    expect(swapped.villain.villainId).toBe("thunderball");
    const after = defeatMinion(swapped, minionId);
    const wrecker = after.reserveVillains!.find(
      (r) => r.villain.villainId === "wrecker",
    )!;
    expect(wrecker.encounterDiscard).toEqual(["07008"]);
    expect(after.encounterDiscard).not.toContain("07008");
  });
});

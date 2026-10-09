import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { dealPendingEncounterCards } from "../src/game/dealEncounterCards";
import { addThreatStep } from "../src/game/addThreat";

describe("dealPendingEncounterCards", () => {
  it("reparte una carta del mazo a cada jugador pendiente", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      pendingEncounterDeals: ["player-1"],
    };
    const { state: after, events } = dealPendingEncounterCards(state);
    expect(after.players[0]!.faceDownEncounterCards).toHaveLength(1);
    expect(after.encounterDeck).toHaveLength(base.encounterDeck.length - 1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "ENCOUNTER_CARD_DEALT" }),
    );
  });

  it("mazo agotado: baraja el descarte y gana un token de aceleración", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      encounterDeck: [],
      encounterDiscard: ["01098", "01099"],
      pendingEncounterDeals: ["player-1"],
    };
    const { state: after, events } = dealPendingEncounterCards(state);
    expect(after.players[0]!.faceDownEncounterCards).toHaveLength(1);
    expect(after.encounterDiscard).toHaveLength(0);
    // Quedó 1 carta en el mazo tras barajar 2 y repartir 1
    expect(after.encounterDeck).toHaveLength(1);
    const mainScheme = after.schemes.find((s) => s.isMain)!;
    expect(mainScheme.accelerationTokens).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "ENCOUNTER_DECK_RESHUFFLED" }),
    );
  });

  it("varios agotamientos seguidos acumulan tokens de aceleración", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      encounterDeck: [],
      encounterDiscard: ["01098"],
      pendingEncounterDeals: ["player-1", "player-1"],
    };
    // Primer reparto: baraja (1 token), reparte esa carta, mazo queda vacío.
    // Segundo reparto: mazo y descarte vacíos, no hay carta que repartir.
    const { state: after } = dealPendingEncounterCards(state);
    const mainScheme = after.schemes.find((s) => s.isMain)!;
    expect(mainScheme.accelerationTokens).toBe(1);
    expect(after.players[0]!.faceDownEncounterCards).toHaveLength(1);
  });

  it("el token de aceleración se suma de forma fija en addThreatStep (no se multiplica por jugadores)", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const withToken = {
      ...base,
      schemes: base.schemes.map((s) =>
        s.isMain ? { ...s, accelerationTokens: 2 } : s,
      ),
    };
    const { state: after } = addThreatStep(withToken);
    const mainScheme = after.schemes.find((s) => s.isMain)!;
    // escalationThreat (1) * 1 jugador + 2 tokens fijos = 3
    expect(mainScheme.threat).toBe(3);
  });
});

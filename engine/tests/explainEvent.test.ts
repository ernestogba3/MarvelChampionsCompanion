import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { runAndLog } from "../src/events/log";
import { resolveImTough } from "../src/game/villainTreacheries";
import {
  explainEvent,
  explainRecentEvents,
} from "../src/explanations/explainEvent";
describe("Sistema educativo (Fase 5, pasos 2-4)", () => {
  it("explica un evento THREAT_ADDED", () => {
    const explanation = explainEvent({
      type: "THREAT_ADDED",
      schemeId: "main-break-in",
      amount: 1,
    });
    expect(explanation.title).toBe("Amenaza añadida");
    expect(explanation.description).toContain("1");
  });
  it("explica un evento VILLAIN_ATTACKED", () => {
    const explanation = explainEvent({
      type: "VILLAIN_ATTACKED",
      playerId: "player-1",
      amount: 2,
    });
    expect(explanation.title).toBe("El villano ataca");
    expect(explanation.nextStep).toBeDefined();
  });
  it("explica STATUS_GAINED (TOUGH) usando el concepto de dureza", () => {
    const explanation = explainEvent({
      type: "STATUS_GAINED",
      targetId: "villain",
      status: "TOUGH",
    });
    expect(explanation.title).toBe("Dureza");
  });
  it("explainRecentEvents traduce los últimos eventos de una partida real", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = runAndLog(resolveImTough, state);
    const explanations = explainRecentEvents(after, 1);
    expect(explanations).toHaveLength(1);
    expect(explanations[0]!.title).toBe("Dureza");
  });
});

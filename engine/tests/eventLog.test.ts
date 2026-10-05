import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { appendToLog, runAndLog } from "../src/events/log";
import { resolveImTough } from "../src/game/villainTreacheries";
describe("Log de eventos (Fase 5, paso 1)", () => {
  it("appendToLog añade eventos al historial", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const after = appendToLog(state, [
      { type: "STATUS_GAINED", targetId: "villain", status: "TOUGH" },
    ]);
    expect(after.eventLog).toHaveLength(1);
  });
  it("runAndLog ejecuta un resolver y registra sus eventos automáticamente", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: after } = runAndLog(resolveImTough, state);
    expect(after.villain.tough).toBe(true);
    expect(after.eventLog).toHaveLength(1);
    expect(after.eventLog[0]).toEqual({
      type: "STATUS_GAINED",
      targetId: "villain",
      status: "TOUGH",
    });
  });
  it("el log se acumula a través de varias llamadas", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const { state: afterFirst } = runAndLog(resolveImTough, state);
    const { state: afterSecond } = runAndLog(resolveImTough, afterFirst);
    expect(afterSecond.eventLog).toHaveLength(2);
  });
});

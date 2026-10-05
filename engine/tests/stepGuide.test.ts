import { describe, it, expect } from "vitest";
import { createSpiderManVsRhinoGame } from "../src/game/createGame";
import { describeCurrentStep } from "../src/explanations/stepGuide";
import type { VillainPhaseStep } from "../src/domain/types";
describe("Asistente paso a paso (Fase 6)", () => {
  it("describe la fase de jugador", () => {
    const state = createSpiderManVsRhinoGame("player-1");
    const guide = describeCurrentStep(state);
    expect(guide.title).toBe("Fase de jugador");
  });
  it("describe el Paso 1 de la fase del villano", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const state = {
      ...base,
      phase: { name: "VILLAIN_PHASE" as const, step: "ADD_THREAT" as const },
    };
    const guide = describeCurrentStep(state);
    expect(guide.title).toBe("Paso 1 — Añade amenaza");
  });
  it("los 5 pasos de la fase del villano tienen títulos distintos", () => {
    const base = createSpiderManVsRhinoGame("player-1");
    const steps: VillainPhaseStep[] = [
      "ADD_THREAT",
      "VILLAIN_ACTIVATION",
      "DEAL_ENCOUNTER_CARDS",
      "REVEAL_ENCOUNTER_CARDS",
      "PASS_FIRST_PLAYER",
    ];
    const titles = steps.map(
      (step) =>
        describeCurrentStep({ ...base, phase: { name: "VILLAIN_PHASE", step } })
          .title,
    );
    expect(new Set(titles).size).toBe(5);
  });
});

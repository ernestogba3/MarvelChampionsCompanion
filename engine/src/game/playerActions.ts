import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { dealDamageToVillain } from "./villainDamage";
import { advanceToRhinoStageTwo } from "./villainStages";

export function attackVillain(
  state: GameState,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  const { state: afterDamage, events } = dealDamageToVillain(state, amount);

  if (afterDamage.villain.health <= 0 && afterDamage.villain.stage === "I") {
    const { state: afterStage, events: stageEvents } =
      advanceToRhinoStageTwo(afterDamage);
    return {
      state: afterStage,
      events: [...events, ...stageEvents],
    };
  }

  return { state: afterDamage, events };
}

export type GameOutcome = "ONGOING" | "WIN" | "LOSS";

export function checkGameOutcome(state: GameState): GameOutcome {
  const mainScheme = state.schemes.find((s) => s.isMain);

  if (mainScheme && mainScheme.threat >= mainScheme.threatToComplete) {
    // TODO: TC-014 — verificar el momento exacto en que se comprueba esto contra el reglamento físico
    return "LOSS";
  }

  if (state.villain.stage === "II" && state.villain.health <= 0) {
    return "WIN";
  }

  return "ONGOING";
}

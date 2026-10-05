import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { dealDamageToVillain } from "./villainDamage";
import { advanceToRhinoStageTwo } from "./villainStages";
import { canRemoveThreatFromMainScheme } from "./sideSchemes";

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

export function attackMinion(
  state: GameState,
  minionId: string,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  const minion = state.minions.find((m) => m.id === minionId);
  if (!minion) {
    return { state, events: [] };
  }
  if (minion.tough) {
    return {
      state: {
        ...state,
        minions: state.minions.map((m) =>
          m.id === minionId ? { ...m, tough: false } : m,
        ),
      },
      events: [{ type: "STATUS_REMOVED", targetId: minionId, status: "TOUGH" }],
    };
  }
  const newHealth = Math.max(0, minion.health - amount);
  const events: GameEvent[] = [
    { type: "DAMAGE_DEALT", targetId: minion.id, amount, source: "player" },
  ];
  if (newHealth <= 0) {
    return {
      state: {
        ...state,
        minions: state.minions.filter((m) => m.id !== minionId),
      },
      events,
    };
  }
  return {
    state: {
      ...state,
      minions: state.minions.map((m) =>
        m.id === minionId ? { ...m, health: newHealth } : m,
      ),
    },
    events,
  };
}

export function thwartScheme(
  state: GameState,
  schemeId: string,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  const scheme = state.schemes.find((s) => s.id === schemeId);
  if (!scheme) {
    return { state, events: [] };
  }
  if (scheme.isMain && !canRemoveThreatFromMainScheme(state)) {
    return { state, events: [] };
  }
  const newThreat = Math.max(0, scheme.threat - amount);
  const removed = scheme.threat - newThreat;
  const events: GameEvent[] = [
    { type: "THREAT_REMOVED", schemeId, amount: removed },
  ];
  if (!scheme.isMain && newThreat === 0) {
    return {
      state: {
        ...state,
        schemes: state.schemes.filter((s) => s.id !== schemeId),
      },
      events,
    };
  }
  return {
    state: {
      ...state,
      schemes: state.schemes.map((s) =>
        s.id === schemeId ? { ...s, threat: newThreat } : s,
      ),
    },
    events,
  };
}

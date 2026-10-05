import type { GameState, SchemeState } from "../domain/types.ts";
import type { GameEvent } from "../events/types.ts";
export function advanceToRhinoStageTwo(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  events.push({
    type: "VILLAIN_STAGE_CHANGED",
    from: state.villain.stage,
    to: "II",
  });
  const newVillain = {
    ...state.villain,
    stage: "II" as const,
    attack: 3,
    health: 15,
    maxHealth: 15,
    scheme: 1,
    tough: false,
  };
  const breakinTakin: SchemeState = {
    id: "side-breakin-takin",
    name: "Arramblar con todo",
    threat: 2,
    threatToComplete: 0,
    escalationThreat: 0,
    isMain: false,
  };
  events.push({
    type: "SIDE_SCHEME_ENTERED",
    schemeId: breakinTakin.id,
    name: breakinTakin.name,
  });
  return {
    state: {
      ...state,
      villain: newVillain,
      schemes: [...state.schemes, breakinTakin],
    },
    events,
  };
}

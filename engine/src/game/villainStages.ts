import type { GameState, PlayerState, SchemeState } from "../domain/types.ts";
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

export function advanceToRhinoStageThree(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  events.push({
    type: "VILLAIN_STAGE_CHANGED",
    from: state.villain.stage,
    to: "III",
  });
  // Rino III (01096): vida 16, ATQ 4, Plan 1. Palabra clave: Dureza
  // (modelada aquí como tough: true inicial).
  const newVillain = {
    ...state.villain,
    stage: "III" as const,
    attack: 4,
    health: 16,
    maxHealth: 16,
    scheme: 1,
    tough: true,
    attachments: [],
  };
  events.push({ type: "STATUS_GAINED", targetId: "villain", status: "TOUGH" });

  // Habilidad "cuando se revela" de Rino III: aturde a todos los héroes.
  const newPlayers: PlayerState[] = state.players.map((p) => ({
    ...p,
    stunned: true,
  }));
  for (const p of state.players) {
    if (!p.stunned) {
      events.push({ type: "STATUS_GAINED", targetId: p.id, status: "STUNNED" });
    }
  }

  return {
    state: {
      ...state,
      villain: newVillain,
      players: newPlayers,
    },
    events,
  };
}
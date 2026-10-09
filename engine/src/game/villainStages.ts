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
  // Los PG de Rino (II) escalan ×nº de jugadores (confirmado contra el RRG
  // v1.7 / datos per-player de marvelcdb), igual que al crear la partida.
  const health = 15 * state.players.length;
  const newVillain = {
    ...state.villain,
    cardId: "01095",
    stage: "II" as const,
    attack: 3,
    health,
    maxHealth: health,
    scheme: 1,
    tough: false,
  };
  const breakinTakin: SchemeState = {
    id: "side-breakin-takin",
    cardId: "01107",
    name: "Arramblar con todo",
    threat: 2,
    threatToComplete: 0,
    escalationThreat: 0,
    isMain: false,
    accelerationTokens: 0,
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
  // Rino III (01096): ATQ 4, Plan 1, PG escalan ×nº de jugadores igual que
  // en el resto de estadios. Palabra clave: Resistente (modelada aquí como
  // tough: true inicial — confirmado que Rino III la lleva impresa).
  const health = 16 * state.players.length;
  const newVillain = {
    ...state.villain,
    cardId: "01096",
    stage: "III" as const,
    attack: 4,
    health,
    maxHealth: health,
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

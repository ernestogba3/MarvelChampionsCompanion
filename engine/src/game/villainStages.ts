import type {
  GameState,
  PlayerState,
  SchemeState,
  VillainState,
} from "../domain/types.ts";
import type { GameEvent } from "../events/types.ts";
import { getScenarioForState, villainDefinition } from "../scenarios";
import {
  faceForNextStage,
  revealVillainFace,
  stageFace,
} from "./villainFaces";

/**
 * Avanza el villano a su SIGUIENTE estadio (I→II→III) leyendo la definición
 * del escenario (ver scenarios/). Es la ruta genérica que usa ahora el motor
 * (attackVillain). Reproduce exactamente lo que hacían advanceToRhinoStageTwo
 * / advanceToRhinoStageThree para Rino:
 *   - construye el nuevo villano desde los datos del estadio (PG ×jugadores),
 *   - aplica Resistente y/o aturdir-a-todos si el estadio los trae al revelarse,
 *   - descarta las acopladas si el estadio lo indica (Rino III sí, II no),
 *   - mete en juego los planes secundarios que entran con el estadio.
 *
 * Si el villano no tiene escenario registrado o ya está en el último estadio
 * definido, devuelve el estado intacto (attackVillain solo llama a esto cuando
 * el estadio actual no es el final).
 */
export function advanceVillainStage(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const scenario = getScenarioForState(state);
  const villainDef =
    scenario !== undefined
      ? villainDefinition(scenario, state.villain.villainId)
      : undefined;
  if (villainDef === undefined) {
    return { state, events: [] };
  }
  const currentIndex = villainDef.stages.findIndex(
    (s) => s.stage === state.villain.stage,
  );
  if (currentIndex < 0) {
    return { state, events: [] };
  }
  const nextStage = villainDef.stages[currentIndex + 1];
  if (nextStage === undefined) {
    return { state, events: [] };
  }

  const events: GameEvent[] = [];
  events.push({
    type: "VILLAIN_STAGE_CHANGED",
    from: state.villain.stage,
    to: nextStage.stage,
  });

  const health = nextStage.healthPerPlayer * state.players.length;
  const newDroneBonus = nextStage.droneBonus ?? 0;
  // Villano de dos caras: el nuevo estadio entra por la cara que indique
  // faceForNextStage (asunción documentada en game/villainFaces.ts). Un
  // villano normal se queda en su única cara (A).
  const face =
    state.villain.face !== undefined
      ? faceForNextStage(state.villain.face)
      : undefined;
  const { def: faceDef, name } = stageFace(
    villainDef.name,
    nextStage,
    face ?? "A",
  );
  const newVillain: VillainState = {
    ...state.villain,
    name,
    ...(face !== undefined && { face }),
    cardId: faceDef.cardId,
    stage: nextStage.stage,
    attack: faceDef.attack,
    scheme: faceDef.scheme,
    health,
    maxHealth: health,
    tough: nextStage.tough,
    immuneWhileDronesPresent: nextStage.immuneWhileDronesPresent ?? false,
    droneBonus: newDroneBonus,
    // Solo se tocan las acopladas si el estadio lo pide; si no, se conservan.
    ...(nextStage.clearAttachmentsOnEnter && { attachments: [] }),
  };

  if (nextStage.tough) {
    events.push({
      type: "STATUS_GAINED",
      targetId: "villain",
      status: "TOUGH",
    });
  }

  const newSideSchemes: SchemeState[] = nextStage.sideSchemesOnEnter.map(
    (s) => ({
      id: s.id,
      cardId: s.cardId,
      name: s.name,
      threat: s.threat,
      threatToComplete: s.threatToComplete,
      escalationThreat: s.escalationThreat,
      isMain: false,
      accelerationTokens: s.accelerationTokens,
    }),
  );
  for (const s of newSideSchemes) {
    events.push({ type: "SIDE_SCHEME_ENTERED", schemeId: s.id, name: s.name });
  }

  let newPlayers: PlayerState[] = state.players;
  if (nextStage.stunAllOnReveal) {
    newPlayers = state.players.map((p) => ({ ...p, stunned: true }));
    for (const p of state.players) {
      if (!p.stunned) {
        events.push({
          type: "STATUS_GAINED",
          targetId: p.id,
          status: "STUNNED",
        });
      }
    }
  }

  // Escalado de Drones: si el nuevo estadio cambia el bonus de dron (Ultron III
  // = +1/+1), los Drones ya en juego se ajustan por la diferencia. El Plan de
  // los drones no escala; solo ATQ y PG (y máximo).
  const droneDelta = newDroneBonus - (state.villain.droneBonus ?? 0);
  const newMinions =
    droneDelta === 0
      ? state.minions
      : state.minions.map((m) =>
          m.isDrone
            ? {
                ...m,
                attack: Math.max(0, m.attack + droneDelta),
                health: Math.max(1, m.health + droneDelta),
                maxHealth: Math.max(1, m.maxHealth + droneDelta),
              }
            : m,
        );

  const advanced: GameState = {
    ...state,
    villain: newVillain,
    schemes: [...state.schemes, ...newSideSchemes],
    players: newPlayers,
    minions: newMinions,
  };

  // "Cuando se muestre esta carta" del nuevo estadio declarado en datos
  // (daño a los jugadores, cartas de encuentro repartidas).
  const { state: revealed, events: revealEvents } = revealVillainFace(
    advanced,
    faceDef,
  );

  return { state: revealed, events: [...events, ...revealEvents] };
}

// ---------------------------------------------------------------------------
// Funciones específicas de Rino (originales). Siguen aquí por compatibilidad
// con cualquier test que las importe directamente; el motor ya no las usa
// (usa advanceVillainStage). Se pueden borrar cuando se confirme que ningún
// test las referencia.
// ---------------------------------------------------------------------------

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

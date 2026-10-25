import type {
  GameState,
  ReserveVillainState,
  SchemeState,
  VillainState,
} from "../domain/types";
import type { GameEvent } from "../events/types";
import type { Effect } from "../effects/types";
import { applyEffects } from "../effects/applyEffect";
import { getScenarioForState, villainDefinition } from "../scenarios";
import { millPlayerDeck } from "./playerLibrary";
import { advanceMainSchemeIfComplete } from "./mainScheme";

// ---------------------------------------------------------------------------
// Varios villanos a la vez con contador activo (The Wrecking Crew; reglas del
// inserto oficial del pack). El villano ACTIVO vive en GameState.villain /
// encounterDeck / encounterDiscard, igual que en cualquier escenario, así que
// el resto del motor no cambia; los demás esperan en reserveVillains con su
// propio mazo y descarte. Mover el contador activo = intercambiarlos.
// ---------------------------------------------------------------------------

/** true si la partida tiene varios villanos a la vez. */
export function isMultiVillain(state: GameState): boolean {
  return state.reserveVillains !== undefined;
}

/** Villanos en juego: el activo y los de reserva. */
export function allVillains(state: GameState): VillainState[] {
  return [state.villain, ...(state.reserveVillains ?? []).map((r) => r.villain)];
}

/** Villano en juego por su id (activo o en reserva). */
export function findVillain(
  state: GameState,
  villainId: string,
): VillainState | undefined {
  return allVillains(state).find((v) => v.villainId === villainId);
}

/** Plan secundario propio de un villano, si está en juego. */
export function ownSideScheme(
  state: GameState,
  villainId: string | undefined,
): SchemeState | undefined {
  if (villainId === undefined) return undefined;
  return state.schemes.find((s) => s.villainId === villainId);
}

function ownSideSchemeThreat(state: GameState, villainId: string): number {
  return ownSideScheme(state, villainId)?.threat ?? 0;
}

/** Orden de los villanos en la definición del escenario (para desempatar). */
function scenarioOrder(state: GameState, villainId: string): number {
  const ids = getScenarioForState(state)?.villains?.map((v) => v.id) ?? [];
  const idx = ids.indexOf(villainId);
  return idx < 0 ? Number.MAX_SAFE_INTEGER : idx;
}

/**
 * Elige el villano cuyo plan propio tiene más (MOST) o menos (LEAST)
 * amenaza. En empate "elige el jugador inicial": el motor se queda con el
 * activo si es uno de los empatados y, si no, con el primero en el orden del
 * escenario; tiedWith lista los demás empatados para que la app permita
 * cambiar la elección (setActiveVillain).
 */
export function pickVillainBySideSchemeThreat(
  state: GameState,
  which: "MOST" | "LEAST",
  candidates: VillainState[] = allVillains(state),
): { villainId: string; tiedWith: string[] } | undefined {
  const withIds = candidates.filter(
    (v): v is VillainState & { villainId: string } => v.villainId !== undefined,
  );
  if (withIds.length === 0) return undefined;
  const threats = withIds.map((v) => ownSideSchemeThreat(state, v.villainId));
  const target = which === "MOST" ? Math.max(...threats) : Math.min(...threats);
  const tied = withIds
    .filter((_, i) => threats[i] === target)
    .map((v) => v.villainId)
    .sort((a, b) => scenarioOrder(state, a) - scenarioOrder(state, b));
  const activeId = state.villain.villainId;
  const chosen =
    activeId !== undefined && tied.includes(activeId) ? activeId : tied[0];
  if (chosen === undefined) return undefined;
  return { villainId: chosen, tiedWith: tied.filter((id) => id !== chosen) };
}

/**
 * Intercambia el villano activo con uno de reserva (sus mazos incluidos). Sin
 * eventos. Id desconocido o ya activo → estado intacto.
 */
function swapActive(state: GameState, villainId: string): GameState {
  const reserve = state.reserveVillains;
  if (reserve === undefined || state.villain.villainId === villainId) {
    return state;
  }
  const incoming = reserve.find((r) => r.villain.villainId === villainId);
  if (incoming === undefined) return state;
  const outgoing: ReserveVillainState = {
    villain: state.villain,
    encounterDeck: state.encounterDeck,
    encounterDiscard: state.encounterDiscard,
  };
  return {
    ...state,
    villain: incoming.villain,
    encounterDeck: incoming.encounterDeck,
    encounterDiscard: incoming.encounterDiscard,
    reserveVillains: reserve.map((r) =>
      r.villain.villainId === villainId ? outgoing : r,
    ),
  };
}

/**
 * Da el contador activo a un villano. Es también la acción manual de la app
 * (empates que decide el jugador inicial y efectos de carta guiados que
 * "mueven el contador activo").
 */
export function setActiveVillain(
  state: GameState,
  villainId: string,
  tiedWith: string[] = [],
): { state: GameState; events: GameEvent[] } {
  const from = state.villain.villainId;
  const next = swapActive(state, villainId);
  if (from === undefined || (next === state && tiedWith.length === 0)) {
    return { state, events: [] };
  }
  return {
    state: next,
    events: [
      {
        type: "ACTIVE_VILLAIN_CHANGED",
        fromVillainId: from,
        toVillainId: villainId,
        villainName: next.villain.name,
        tiedWith,
      },
    ],
  };
}

/**
 * Mueve el contador activo al villano cuyo plan propio tiene más/menos
 * amenaza (Fuga de prisión, Lanzamiento de palanca…).
 */
export function moveActiveVillain(
  state: GameState,
  which: "MOST" | "LEAST",
): { state: GameState; events: GameEvent[] } {
  if (!isMultiVillain(state)) return { state, events: [] };
  const pick = pickVillainBySideSchemeThreat(state, which);
  if (pick === undefined) return { state, events: [] };
  return setActiveVillain(state, pick.villainId, pick.tiedWith);
}

/**
 * Ejecuta `fn` con `villainId` como villano activo y luego devuelve el
 * contador al que lo tenía (si sigue en juego). Para atacar a un villano que
 * no es el activo: "los jugadores pueden atacar a cualquier villano".
 */
export function withVillainActive(
  state: GameState,
  villainId: string,
  fn: (s: GameState) => { state: GameState; events: GameEvent[] },
): { state: GameState; events: GameEvent[] } {
  const originalId = state.villain.villainId;
  if (originalId === undefined || originalId === villainId) return fn(state);
  const result = fn(swapActive(state, villainId));
  const stillInPlay = findVillain(result.state, originalId) !== undefined;
  return {
    state: stillInPlay ? swapActive(result.state, originalId) : result.state,
    events: result.events,
  };
}

/**
 * Retira de juego al villano ACTIVO derrotado junto con su plan propio, si
 * quedan otros villanos (si era el último, no se toca: checkGameOutcome lo da
 * como victoria). El contador activo pasa a `preferredNextId` si está en
 * reserva (p.ej. el que era activo antes de atacar a este) o, si no, al
 * villano con más amenaza en su plan. Las cartas de su mazo en juego siguen
 * en juego; su mazo y su descarte salen de la partida.
 */
export function removeDefeatedActiveVillain(
  state: GameState,
  preferredNextId?: string,
): { state: GameState; events: GameEvent[] } {
  const reserve = state.reserveVillains;
  const defeated = state.villain;
  if (reserve === undefined || reserve.length === 0) {
    return { state, events: [] };
  }
  const preferred = reserve.find((r) => r.villain.villainId === preferredNextId);
  const pick =
    preferred !== undefined
      ? { villainId: preferredNextId ?? "", tiedWith: [] }
      : pickVillainBySideSchemeThreat(
          state,
          "MOST",
          reserve.map((r) => r.villain),
        );
  const next = reserve.find((r) => r.villain.villainId === pick?.villainId);
  if (next === undefined || pick === undefined) {
    return { state, events: [] };
  }
  const events: GameEvent[] = [
    {
      type: "VILLAIN_DEFEATED",
      villainId: defeated.villainId ?? "",
      villainName: defeated.name,
    },
    {
      type: "ACTIVE_VILLAIN_CHANGED",
      fromVillainId: defeated.villainId ?? "",
      toVillainId: pick.villainId,
      villainName: next.villain.name,
      tiedWith: pick.tiedWith,
    },
  ];
  return {
    state: {
      ...state,
      villain: next.villain,
      encounterDeck: next.encounterDeck,
      encounterDiscard: next.encounterDiscard,
      reserveVillains: reserve.filter((r) => r !== next),
      schemes: state.schemes.filter((s) => s.villainId !== defeated.villainId),
    },
    events,
  };
}

/**
 * Respuesta obligada de los planes propios: "después de que se coloque
 * amenaza aquí, si hay N o más, [efecto]. Quita toda la amenaza menos M".
 * Revisa todos los planes propios en juego y dispara los que lleguen a su
 * umbral. Se llama tras cada efecto del motor que coloca amenaza.
 */
export function resolveSignatureSchemeOverflows(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const scenario = getScenarioForState(state);
  if (scenario?.villains === undefined) return { state, events: [] };
  let current = state;
  const events: GameEvent[] = [];
  for (const scheme of state.schemes) {
    const def = villainDefinition(scenario, scheme.villainId)?.signatureScheme;
    const live = current.schemes.find((s) => s.id === scheme.id);
    if (def === undefined || live === undefined) continue;
    if (live.threat < def.overflowAt) continue;

    const effect = def.overflowEffect;
    const effects: Effect[] = [];
    if (effect.type === "DAMAGE_EACH_PLAYER") {
      for (const p of current.players) {
        effects.push({
          type: "DEAL_DAMAGE",
          target: { kind: "PLAYER", playerId: p.id },
          amount: effect.amount,
          source: def.name,
        });
      }
    } else if (effect.type === "STUN_EACH_PLAYER") {
      for (const p of current.players) {
        if (p.stunned) continue;
        effects.push({
          type: "GAIN_STATUS",
          target: { kind: "PLAYER", playerId: p.id },
          status: "STUNNED",
        });
      }
    }
    const applied = applyEffects(current, effects);
    current = applied.state;
    events.push({
      type: "SIGNATURE_SCHEME_TRIGGERED",
      schemeId: live.id,
      name: def.name,
      resetTo: def.resetTo,
      guided: effect.type === "GUIDED",
    });
    events.push(...applied.events);
    if (effect.type === "MILL_EACH_PLAYER") {
      for (const p of current.players) {
        const milled = millPlayerDeck(current, p.id, effect.count);
        current = milled.state;
        events.push(...milled.events);
      }
    }
    current = {
      ...current,
      schemes: current.schemes.map((s) =>
        s.id === live.id ? { ...s, threat: Math.min(s.threat, def.resetTo) } : s,
      ),
    };
  }
  return { state: current, events };
}

/**
 * Suma amenaza a un plan concreto y resuelve los planes propios que lleguen a
 * su umbral. Acción manual de la app para los efectos de carta guiados
 * ("coloca N de amenaza en el plan de …").
 */
export function addThreatToScheme(
  state: GameState,
  schemeId: string,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  if (amount <= 0 || !state.schemes.some((s) => s.id === schemeId)) {
    return { state, events: [] };
  }
  const placed = applyEffects(state, [
    { type: "ADD_THREAT", target: { kind: "SCHEME", schemeId }, amount },
  ]);
  const overflow = resolveSignatureSchemeOverflows(placed.state);
  // Si era el plan principal y llega a su umbral, avanza de etapa como con
  // cualquier otra amenaza (planes de varias etapas).
  const advanced = advanceMainSchemeIfComplete(overflow.state);
  return {
    state: advanced.state,
    events: [...placed.events, ...overflow.events, ...advanced.events],
  };
}

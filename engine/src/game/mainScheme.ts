import type { GameState, SchemeState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { getScenarioForState } from "../scenarios";
import type {
  MainSchemeCompletionEffect,
  ScenarioDefinition,
  ScenarioMainScheme,
} from "../scenarios";
import { getCardDefinition } from "../data/cards";
import { adjustEnvironmentCounters } from "./villainFaces";
import { millPlayerDeck } from "./playerLibrary";

/**
 * Lista ordenada de todas las etapas del plan principal de un escenario: la
 * etapa inicial seguida de las adicionales. Una sola entrada = plan de una
 * etapa (Rino); varias = plan multi-etapa (Klaw).
 */
function mainSchemeStages(
  scenario: ScenarioDefinition | undefined,
): ScenarioMainScheme[] {
  if (scenario === undefined) return [];
  return [scenario.mainScheme, ...(scenario.additionalMainSchemeStages ?? [])];
}

/**
 * Amenaza con la que entra una etapa del plan principal: la impresa, ×nº de
 * jugadores si la carta lleva el icono [per_hero] (startingThreatPerPlayer).
 */
export function mainSchemeStartingThreat(
  stage: ScenarioMainScheme,
  playerCount: number,
): number {
  return stage.startingThreatPerPlayer === true
    ? stage.startingThreat * playerCount
    : stage.startingThreat;
}

/** Definición de la etapa del plan principal en juego (por su cardId). */
export function currentMainSchemeDefinition(
  state: GameState,
): ScenarioMainScheme | undefined {
  const main = state.schemes.find((s) => s.isMain);
  if (main === undefined) return undefined;
  return mainSchemeStages(getScenarioForState(state)).find(
    (st) => st.cardId === main.cardId,
  );
}

/** Nº de enemigos en juego (villano + esbirros) con el rasgo dado. */
export function countEnemiesWithTrait(state: GameState, trait: string): number {
  const hasTrait = (cardId: string) =>
    getCardDefinition(cardId)?.traits?.includes(trait) ?? false;
  const villain = hasTrait(state.villain.cardId) ? 1 : 0;
  return villain + state.minions.filter((m) => hasTrait(m.cardId)).length;
}

/** Iconos de Aceleración impresos en los planes en juego (principal y secundarios). */
export function accelerationIconsInPlay(state: GameState): number {
  return state.schemes.reduce(
    (sum, s) => sum + (getCardDefinition(s.cardId)?.accelerationIcons ?? 0),
    0,
  );
}

/**
 * Amenaza que se añade al plan principal en el paso 1 de la fase del villano:
 *   - la aceleración impresa ×nº de jugadores, o la variable "X = enemigos con
 *     el rasgo" (Nube de mutágeno), que NO escala por jugadores;
 *   - + los tokens de aceleración (mazo de encuentros agotado), fijos;
 *   - + 1 por cada icono de Aceleración de los planes en juego.
 */
export function mainSchemeThreatPerRound(state: GameState): number {
  const main = state.schemes.find((s) => s.isMain);
  if (main === undefined) return 0;
  const trait = currentMainSchemeDefinition(state)?.escalationPerEnemyWithTrait;
  const escalation =
    trait !== undefined
      ? countEnemiesWithTrait(state, trait)
      : main.escalationThreat * state.players.length;
  return escalation + main.accelerationTokens + accelerationIconsInPlay(state);
}

/**
 * Resuelve el "Cuando se complete esta etapa" que el motor sabe aplicar. El
 * resto de efectos de completar etapa son guiados (texto de la carta).
 */
function resolveCompletionEffect(
  state: GameState,
  effect: MainSchemeCompletionEffect,
): { state: GameState; events: GameEvent[] } {
  // OPA hostil: Infamia sobre Empresa criminal (solo si está por su cara A) y
  // luego descarta del mazo de cada jugador 1 carta por contador de Infamia.
  if (state.environment?.face !== "A") {
    return { state, events: [] };
  }
  const placed = adjustEnvironmentCounters(
    state,
    effect.countersPerPlayer * state.players.length,
  );
  let current = placed.state;
  const events = [...placed.events];
  const toMill = current.environment?.counters ?? 0;
  for (const p of current.players) {
    const milled = millPlayerDeck(current, p.id, toMill);
    current = milled.state;
    events.push(...milled.events);
  }
  return { state: current, events };
}

/**
 * Si el plan principal alcanzó su umbral y existe una etapa siguiente, avanza
 * a ella: resuelve el "Cuando se complete" de la etapa completada (si el motor
 * lo modela), sustituye la carta/nombre/umbral del plan principal por los de
 * la nueva etapa, pone la amenaza inicial de esa etapa (×jugadores si la
 * carta lo indica) y conserva los tokens de aceleración acumulados. Emite
 * MAIN_SCHEME_ADVANCED.
 *
 * No avanza (devuelve el estado intacto) si: no hay escenario registrado, el
 * plan es de una sola etapa, el plan aún no ha llegado a su umbral, o ya está
 * en la etapa final (en ese caso la derrota la detecta checkGameOutcome).
 */
export function advanceMainSchemeIfComplete(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const scenario = getScenarioForState(state);
  const stages = mainSchemeStages(scenario);
  if (stages.length <= 1) {
    return { state, events: [] };
  }

  const main = state.schemes.find((s) => s.isMain);
  if (main === undefined || main.threat < main.threatToComplete) {
    return { state, events: [] };
  }

  const currentIndex = stages.findIndex((st) => st.cardId === main.cardId);
  if (currentIndex < 0) {
    return { state, events: [] };
  }
  const current = stages[currentIndex];
  const next = stages[currentIndex + 1];
  if (current === undefined || next === undefined) {
    // Etapa final completada: no se avanza; checkGameOutcome marca la derrota.
    return { state, events: [] };
  }

  const { state: afterCompletion, events: completionEvents } =
    current.whenCompleted !== undefined
      ? resolveCompletionEffect(state, current.whenCompleted)
      : { state, events: [] };

  const advanced: SchemeState = {
    id: next.id,
    cardId: next.cardId,
    name: next.name,
    threat: mainSchemeStartingThreat(next, afterCompletion.players.length),
    threatToComplete:
      next.threatToCompletePerPlayer * afterCompletion.players.length,
    escalationThreat: next.escalationThreat,
    isMain: true,
    // Los tokens de aceleración son una penalización persistente del escenario;
    // se conservan al avanzar de etapa.
    accelerationTokens: main.accelerationTokens,
  };

  return {
    state: {
      ...afterCompletion,
      schemes: afterCompletion.schemes.map((s) => (s.isMain ? advanced : s)),
    },
    events: [
      ...completionEvents,
      {
        type: "MAIN_SCHEME_ADVANCED",
        from: main.cardId,
        to: next.cardId,
        schemeId: next.id,
      },
    ],
  };
}

/**
 * Devuelve true si el plan principal actual es la ÚLTIMA etapa del escenario
 * (o si el villano no está registrado: se asume plan de una etapa). Lo usa
 * checkGameOutcome para decidir si completar el plan principal es derrota.
 */
export function isMainSchemeFinalStage(state: GameState): boolean {
  const scenario = getScenarioForState(state);
  const stages = mainSchemeStages(scenario);
  if (stages.length === 0) {
    // Sin escenario registrado: comportamiento original (una sola etapa).
    return true;
  }
  const main = state.schemes.find((s) => s.isMain);
  if (main === undefined) return false;
  const lastStage = stages[stages.length - 1];
  return lastStage !== undefined && main.cardId === lastStage.cardId;
}

import type { GameState, SchemeState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { getScenarioByVillainName } from "../scenarios";
import type { ScenarioMainScheme } from "../scenarios";

/**
 * Lista ordenada de todas las etapas del plan principal de un escenario: la
 * etapa inicial seguida de las adicionales. Una sola entrada = plan de una
 * etapa (Rino); varias = plan multi-etapa (Klaw).
 */
function mainSchemeStages(
  scenario: ReturnType<typeof getScenarioByVillainName>,
): ScenarioMainScheme[] {
  if (scenario === undefined) return [];
  return [scenario.mainScheme, ...(scenario.additionalMainSchemeStages ?? [])];
}

/**
 * Si el plan principal alcanzó su umbral y existe una etapa siguiente, avanza
 * a ella: sustituye la carta/nombre/umbral del plan principal por los de la
 * nueva etapa, reinicia la amenaza al valor inicial de esa etapa y conserva
 * los tokens de aceleración acumulados. Emite MAIN_SCHEME_ADVANCED.
 *
 * No avanza (devuelve el estado intacto) si: no hay escenario registrado, el
 * plan es de una sola etapa, el plan aún no ha llegado a su umbral, o ya está
 * en la etapa final (en ese caso la derrota la detecta checkGameOutcome).
 */
export function advanceMainSchemeIfComplete(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const scenario = getScenarioByVillainName(state.villain.name);
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
  const next = stages[currentIndex + 1];
  if (next === undefined) {
    // Etapa final completada: no se avanza; checkGameOutcome marca la derrota.
    return { state, events: [] };
  }

  const advanced: SchemeState = {
    id: next.id,
    cardId: next.cardId,
    name: next.name,
    threat: next.startingThreat,
    threatToComplete: next.threatToCompletePerPlayer * state.players.length,
    escalationThreat: next.escalationThreat,
    isMain: true,
    // Los tokens de aceleración son una penalización persistente del escenario;
    // se conservan al avanzar de etapa.
    accelerationTokens: main.accelerationTokens,
  };

  return {
    state: {
      ...state,
      schemes: state.schemes.map((s) => (s.isMain ? advanced : s)),
    },
    events: [
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
  const scenario = getScenarioByVillainName(state.villain.name);
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

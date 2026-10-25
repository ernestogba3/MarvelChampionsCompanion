import type { ScenarioDefinition } from "./types";
import { RHINO_SCENARIO } from "./rhino";
import { KLAW_SCENARIO } from "./klaw";
import { ULTRON_SCENARIO } from "./ultron";
import { RISKY_BUSINESS_SCENARIO } from "./riskyBusiness";
import { MUTAGEN_FORMULA_SCENARIO } from "./mutagenFormula";

export type {
  ScenarioDefinition,
  VillainStageDefinition,
  VillainFaceAbilities,
  VillainFlipSideDefinition,
  RevealDamage,
  ScenarioMainScheme,
  MainSchemeCompletionEffect,
  ScenarioSideScheme,
  ScenarioEnvironmentDefinition,
  EnvironmentFaceDefinition,
  StageProgression,
} from "./types";

// Registro de escenarios disponibles, por id. Para añadir un villano nuevo:
// crear su archivo de datos (p.ej. scenarios/klaw.ts) e incluirlo aquí.
const SCENARIOS: Record<string, ScenarioDefinition> = {
  [RHINO_SCENARIO.id]: RHINO_SCENARIO,
  [KLAW_SCENARIO.id]: KLAW_SCENARIO,
  [ULTRON_SCENARIO.id]: ULTRON_SCENARIO,
  [RISKY_BUSINESS_SCENARIO.id]: RISKY_BUSINESS_SCENARIO,
  [MUTAGEN_FORMULA_SCENARIO.id]: MUTAGEN_FORMULA_SCENARIO,
};

/** Busca un escenario por su id (la clave estable: "rhino", "klaw", …). */
export function getScenario(id: string): ScenarioDefinition | undefined {
  return SCENARIOS[id];
}

/**
 * Busca el escenario por el nombre del villano (state.villain.name). Solo
 * sirve como respaldo para partidas guardadas antes de que GameState llevara
 * scenarioId: el nombre no es una clave fiable (cambia al darse la vuelta un
 * villano de dos caras y dos escenarios pueden compartir villano). El motor
 * usa getScenarioForState.
 */
export function getScenarioByVillainName(
  name: string,
): ScenarioDefinition | undefined {
  for (const scenario of Object.values(SCENARIOS)) {
    if (scenario.villainName === name) return scenario;
  }
  return undefined;
}

/**
 * Escenario de una partida: por state.scenarioId si lo trae (partidas creadas
 * con createGame) y, si no, por el nombre del villano (partidas antiguas).
 */
export function getScenarioForState(state: {
  scenarioId?: string;
  villain: { name: string };
}): ScenarioDefinition | undefined {
  if (state.scenarioId !== undefined) {
    return getScenario(state.scenarioId);
  }
  return getScenarioByVillainName(state.villain.name);
}

/** Todos los escenarios registrados (p.ej. para que la app liste villanos). */
export const ALL_SCENARIOS: ScenarioDefinition[] = Object.values(SCENARIOS);

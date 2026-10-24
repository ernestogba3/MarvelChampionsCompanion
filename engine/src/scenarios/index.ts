import type { ScenarioDefinition } from "./types";
import { RHINO_SCENARIO } from "./rhino";
import { KLAW_SCENARIO } from "./klaw";
import { ULTRON_SCENARIO } from "./ultron";

export type {
  ScenarioDefinition,
  VillainStageDefinition,
  ScenarioMainScheme,
  ScenarioSideScheme,
  StageProgression,
} from "./types";

// Registro de escenarios disponibles, por id. Para añadir un villano nuevo:
// crear su archivo de datos (p.ej. scenarios/klaw.ts) e incluirlo aquí.
const SCENARIOS: Record<string, ScenarioDefinition> = {
  [RHINO_SCENARIO.id]: RHINO_SCENARIO,
  [KLAW_SCENARIO.id]: KLAW_SCENARIO,
  [ULTRON_SCENARIO.id]: ULTRON_SCENARIO,
};

/** Busca un escenario por su id (la clave estable: "rhino", "klaw", …). */
export function getScenario(id: string): ScenarioDefinition | undefined {
  return SCENARIOS[id];
}

/**
 * Busca el escenario por el nombre del villano (state.villain.name). Es la
 * clave que el motor usa en tiempo de ejecución para avanzar estadios y
 * detectar la victoria sin guardar nada extra en GameState.
 */
export function getScenarioByVillainName(
  name: string,
): ScenarioDefinition | undefined {
  for (const scenario of Object.values(SCENARIOS)) {
    if (scenario.villainName === name) return scenario;
  }
  return undefined;
}

/** Todos los escenarios registrados (p.ej. para que la app liste villanos). */
export const ALL_SCENARIOS: ScenarioDefinition[] = Object.values(SCENARIOS);

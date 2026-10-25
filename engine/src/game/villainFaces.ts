import type {
  CardFace,
  EnvironmentState,
  GameState,
  VillainState,
} from "../domain/types";
import type { GameEvent } from "../events/types";
import type { Effect } from "../effects/types";
import { applyEffects } from "../effects/applyEffect";
import { getScenarioForState, villainDefinition } from "../scenarios";
import type {
  EnvironmentFaceDefinition,
  ScenarioDefinition,
  VillainFaceAbilities,
  VillainStageDefinition,
} from "../scenarios";

// ---------------------------------------------------------------------------
// Villano de dos caras + Entorno de dos caras con contadores (Negocios
// arriesgados: Norman Osborn ↔ Duende Verde, Empresa criminal ↔ Estado de
// locura). También resuelve los "Cuando se muestre" de cualquier estadio que
// los declare en datos (p.ej. La fórmula mutagénica II/III).
// ---------------------------------------------------------------------------

/** Una cara jugable del villano: stats + habilidades que el motor resuelve. */
export type VillainFace = VillainFaceAbilities & {
  cardId: string;
  attack: number;
  scheme: number;
};

/**
 * Cara de un estadio: la B (flipSide) si se pide y existe; si no, la A, que
 * son los propios campos del estadio con el nombre base del villano.
 */
export function stageFace(
  baseName: string,
  stage: VillainStageDefinition,
  face: CardFace,
): { def: VillainFace; name: string } {
  if (face === "B" && stage.flipSide !== undefined) {
    return { def: stage.flipSide, name: stage.flipSide.name };
  }
  return { def: stage, name: baseName };
}

/**
 * Definición del estadio en juego de un villano (el activo o uno en reserva
 * en los escenarios con varios villanos), con el nombre base del villano.
 */
function villainStage(
  state: GameState,
  villain: VillainState,
): { stage: VillainStageDefinition; name: string } | undefined {
  const scenario = getScenarioForState(state);
  if (scenario === undefined) return undefined;
  const def = villainDefinition(scenario, villain.villainId);
  const stage = def?.stages.find((s) => s.stage === villain.stage);
  if (def === undefined || stage === undefined) return undefined;
  return { stage, name: def.name };
}

/** Cara visible de un villano en juego, o undefined si no hay escenario. */
export function villainFaceOf(
  state: GameState,
  villain: VillainState,
): VillainFace | undefined {
  const found = villainStage(state, villain);
  if (found === undefined) return undefined;
  return stageFace(found.name, found.stage, villain.face ?? "A").def;
}

/** Cara visible del villano activo, o undefined si no hay escenario. */
export function activeVillainFace(state: GameState): VillainFace | undefined {
  return villainFaceOf(state, state.villain);
}

/**
 * Cara con la que entra el SIGUIENTE estadio al derrotar el actual.
 *
 * ASUNCIÓN SIN RULING OFICIAL (ver scenarios/riskyBusiness.ts): entra por la
 * misma cara en la que se derrotó el estadio (en Negocios arriesgados, siempre
 * el Duende Verde, porque Norman no sufre daño) y el Entorno no cambia. Es
 * como se juega en partidas publicadas. Si apareciera un ruling distinto, este
 * es el único punto a cambiar.
 */
export function faceForNextStage(currentFace: CardFace): CardFace {
  return currentFace;
}

function environmentFace(
  scenario: ScenarioDefinition,
  face: CardFace,
): EnvironmentFaceDefinition | undefined {
  if (scenario.environment === undefined) return undefined;
  return face === "A" ? scenario.environment.faceA : scenario.environment.faceB;
}

function buildEnvironment(
  def: EnvironmentFaceDefinition,
  face: CardFace,
  playerCount: number,
): EnvironmentState {
  return {
    cardId: def.cardId,
    name: def.name,
    face,
    counterName: def.counterName,
    counters: def.countersPerPlayer * playerCount,
  };
}

/**
 * Entorno con el que empieza la partida (cara A, con N ×jugadores contadores),
 * o undefined si el escenario no tiene Entorno con contadores.
 */
export function initialEnvironment(
  scenario: ScenarioDefinition,
  playerCount: number,
): EnvironmentState | undefined {
  const def = environmentFace(scenario, "A");
  return def === undefined ? undefined : buildEnvironment(def, "A", playerCount);
}

/**
 * Resuelve los "Cuando se muestre esta carta" de una cara del villano que
 * acaba de mostrarse (al empezar, al avanzar de estadio o al darse la vuelta):
 * daño a los jugadores y/o cartas de encuentro repartidas.
 */
export function revealVillainFace(
  state: GameState,
  face: VillainFace,
): { state: GameState; events: GameEvent[] } {
  const effects: Effect[] = [];
  const damage = face.onRevealDamage;
  if (damage !== undefined && damage.amount > 0) {
    for (const p of state.players) {
      if (damage.heroFormOnly && p.form !== "HERO") continue;
      effects.push({
        type: "DEAL_DAMAGE",
        target: { kind: "PLAYER", playerId: p.id },
        amount: damage.amount,
        source: damage.indirect
          ? `${state.villain.name} (daño indirecto)`
          : state.villain.name,
      });
    }
  }
  const cards = face.dealEncounterCardsOnReveal ?? 0;
  for (const p of state.players) {
    for (let i = 0; i < cards; i++) {
      effects.push({ type: "QUEUE_ENCOUNTER_CARD", playerId: p.id });
    }
  }
  return applyEffects(state, effects);
}

/**
 * Da la vuelta al villano y al Entorno a la vez ("si no hay contadores sobre
 * esta carta, dales la vuelta a ..."). El villano conserva su daño (es la
 * misma carta); el Entorno entra por la otra cara con N ×jugadores
 * contadores. Después se resuelve el "Cuando se muestre" de la cara nueva.
 */
export function flipVillainAndEnvironment(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const scenario = getScenarioForState(state);
  const found = villainStage(state, state.villain);
  const env = state.environment;
  if (
    scenario === undefined ||
    found?.stage.flipSide === undefined ||
    env === undefined
  ) {
    return { state, events: [] };
  }

  const newFace: CardFace = (state.villain.face ?? "A") === "A" ? "B" : "A";
  const { def, name } = stageFace(found.name, found.stage, newFace);
  const envDef = environmentFace(scenario, newFace);
  if (envDef === undefined) {
    return { state, events: [] };
  }
  const newEnvironment = buildEnvironment(envDef, newFace, state.players.length);

  const flipped: GameState = {
    ...state,
    villain: {
      ...state.villain,
      face: newFace,
      cardId: def.cardId,
      name,
      attack: def.attack,
      scheme: def.scheme,
    },
    environment: newEnvironment,
  };
  const events: GameEvent[] = [
    {
      type: "VILLAIN_FLIPPED",
      from: state.villain.name,
      to: name,
      environmentFrom: env.name,
      environmentTo: newEnvironment.name,
    },
  ];
  const { state: revealed, events: revealEvents } = revealVillainFace(
    flipped,
    def,
  );
  return { state: revealed, events: [...events, ...revealEvents] };
}

/**
 * Suma (delta > 0) o quita (delta < 0) contadores del Entorno, sin bajar de 0.
 * Si al quitar se queda sin contadores, villano y Entorno se dan la vuelta.
 * Es también la acción manual de la app para los efectos de carta guiados.
 * Sin Entorno en juego (o delta 0), no hace nada.
 */
export function adjustEnvironmentCounters(
  state: GameState,
  delta: number,
): { state: GameState; events: GameEvent[] } {
  const env = state.environment;
  if (env === undefined || delta === 0) {
    return { state, events: [] };
  }
  const counters = Math.max(0, env.counters + delta);
  const actual = counters - env.counters;
  if (actual === 0) {
    return { state, events: [] };
  }
  const next: GameState = { ...state, environment: { ...env, counters } };
  const events: GameEvent[] = [
    {
      type: "ENVIRONMENT_COUNTERS_CHANGED",
      environmentName: env.name,
      counterName: env.counterName,
      delta: actual,
      counters,
    },
  ];
  if (counters === 0) {
    const { state: flipped, events: flipEvents } =
      flipVillainAndEnvironment(next);
    return { state: flipped, events: [...events, ...flipEvents] };
  }
  return { state: next, events };
}

/**
 * Patrón de texto recurrente de Negocios arriesgados: "Coloca N contadores de
 * Infamia sobre Empresa criminal. Si no puedes hacerlo, quita N contadores de
 * Locura de Estado de locura". Con el Entorno por su cara A suma N; por su
 * cara B quita N (lo que puede darle la vuelta).
 */
export function placeOrElseRemoveEnvironmentCounters(
  state: GameState,
  n: number,
): { state: GameState; events: GameEvent[] } {
  const env = state.environment;
  if (env === undefined) {
    return { state, events: [] };
  }
  return adjustEnvironmentCounters(state, env.face === "A" ? n : -n);
}

/**
 * Interrupción obligada "cuando vaya a sufrir daño, en vez de eso quita esa
 * misma cantidad de contadores del Entorno" (Norman Osborn). Devuelve null si
 * la cara visible no la tiene. El daño que excede los contadores se pierde:
 * se sustituye entero (un daño separado posterior ya golpearía a la otra
 * cara — resolución de Caleb sobre Magic Blast).
 */
export function replaceVillainDamage(
  state: GameState,
  amount: number,
): { state: GameState; events: GameEvent[] } | null {
  const face = activeVillainFace(state);
  if (face?.damageRemovesEnvironmentCounters !== true || !state.environment) {
    return null;
  }
  const replacedEvent: GameEvent = {
    type: "VILLAIN_DAMAGE_REPLACED",
    villainName: state.villain.name,
    amount,
    counterName: state.environment.counterName,
  };
  const { state: next, events } = adjustEnvironmentCounters(state, -amount);
  return { state: next, events: [replacedEvent, ...events] };
}

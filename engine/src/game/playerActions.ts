import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { dealDamageToVillain } from "./villainDamage";
import { advanceVillainStage } from "./villainStages";
import { canRemoveThreatFromMainScheme } from "./sideSchemes";
import { canAttackVillain } from "./combat";
import { getScenarioByVillainName } from "../scenarios";

export function attackVillain(
  state: GameState,
  playerId: string,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  // Guardia solo bloquea al jugador enganchado con ESE esbirro concreto, no
  // a los demás jugadores (confirmado contra el RRG v1.7: "while any
  // minions with this keyword are engaged with A player, THAT player
  // cannot attack villains"). canAttackVillain ya hace este chequeo exacto;
  // lo reutilizamos en vez de duplicarlo.
  if (!canAttackVillain(state, playerId)) {
    const guardMinion = state.minions.find(
      (m) => m.guard && m.engagedWith === playerId,
    )!;
    return {
      state,
      events: [
        {
          type: "ATTACK_BLOCKED_BY_GUARD",
          minionId: guardMinion.id,
          minionName: guardMinion.name,
        },
      ],
    };
  }

  // Resistente (Toughness): si el villano tiene un status card Tough en juego,
  // este ataque no le hace NADA de daño (no se reduce "en N") y el Tough se
  // descarta. Confirmado contra el RRG v1.7: Rino (III) entra en juego con
  // esta keyword, así que su primer golpe recibido siempre debe gastarse así.
  if (state.villain.tough) {
    return {
      state: {
        ...state,
        villain: { ...state.villain, tough: false },
      },
      events: [
        {
          type: "STATUS_REMOVED",
          targetId: "villain",
          status: "TOUGH",
        },
      ],
    };
  }

  const { state: afterDamage, events } = dealDamageToVillain(state, amount);

  if (afterDamage.villain.health <= 0) {
    // Al reducir los PG a 0, si el villano NO está en su estadio final (según
    // la dificultad y la definición del escenario), avanza al siguiente
    // estadio. En el estadio final no se avanza: checkGameOutcome lo marca
    // como WIN. Genérico para cualquier villano registrado (ver scenarios/).
    const scenario = getScenarioByVillainName(afterDamage.villain.name);
    if (scenario !== undefined) {
      const finalStage = scenario.progression[afterDamage.difficulty].final;
      if (afterDamage.villain.stage !== finalStage) {
        const { state: afterStage, events: stageEvents } =
          advanceVillainStage(afterDamage);
        return {
          state: afterStage,
          events: [...events, ...stageEvents],
        };
      }
    }
  }

  return { state: afterDamage, events };
}

export type GameOutcome = "ONGOING" | "WIN" | "LOSS";

export function checkGameOutcome(state: GameState): GameOutcome {
  const scenario = getScenarioByVillainName(state.villain.name);
  const mainScheme = state.schemes.find((s) => s.isMain);

  // Completar el plan principal solo es derrota si el escenario lo indica. En
  // planes de una sola etapa (Rino) sí; en planes de varias etapas (Klaw) la
  // etapa 1 avanza a la 2 en vez de perder, así que no disparamos derrota aquí
  // (la 2ª etapa se gestiona manualmente). Sin escenario registrado, se
  // mantiene el comportamiento original (completar = derrota).
  const mainSchemeCompletionLoses = scenario?.mainSchemeCompletionLoses ?? true;
  if (
    mainSchemeCompletionLoses &&
    mainScheme &&
    mainScheme.threat >= mainScheme.threatToComplete
  ) {
    // TODO: TC-014 — verificar el momento exacto en que se comprueba esto contra el reglamento físico
    return "LOSS";
  }

  // El estadio final depende del escenario y la dificultad. Si por lo que sea
  // no hay escenario registrado para este villano, caemos al comportamiento
  // original (Experto → III, Estándar → II) para no cambiar nada.
  const finalStage =
    scenario !== undefined
      ? scenario.progression[state.difficulty].final
      : state.difficulty === "EXPERT"
        ? "III"
        : "II";
  if (state.villain.stage === finalStage && state.villain.health <= 0) {
    return "WIN";
  }

  return "ONGOING";
}

export function attackMinion(
  state: GameState,
  minionId: string,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  const minion = state.minions.find((m) => m.id === minionId);
  if (!minion) {
    return { state, events: [] };
  }
  if (minion.tough) {
    return {
      state: {
        ...state,
        minions: state.minions.map((m) =>
          m.id === minionId ? { ...m, tough: false } : m,
        ),
      },
      events: [{ type: "STATUS_REMOVED", targetId: minionId, status: "TOUGH" }],
    };
  }
  const newHealth = Math.max(0, minion.health - amount);
  const events: GameEvent[] = [
    { type: "DAMAGE_DEALT", targetId: minion.id, amount, source: "player" },
  ];
  if (newHealth <= 0) {
    return {
      state: {
        ...state,
        minions: state.minions.filter((m) => m.id !== minionId),
      },
      events,
    };
  }
  return {
    state: {
      ...state,
      minions: state.minions.map((m) =>
        m.id === minionId ? { ...m, health: newHealth } : m,
      ),
    },
    events,
  };
}

export function thwartScheme(
  state: GameState,
  schemeId: string,
  amount: number,
): { state: GameState; events: GameEvent[] } {
  const scheme = state.schemes.find((s) => s.id === schemeId);
  if (!scheme) {
    return { state, events: [] };
  }
  if (scheme.isMain && !canRemoveThreatFromMainScheme(state)) {
    return { state, events: [] };
  }
  const newThreat = Math.max(0, scheme.threat - amount);
  const removed = scheme.threat - newThreat;
  const events: GameEvent[] = [
    { type: "THREAT_REMOVED", schemeId, amount: removed },
  ];
  if (!scheme.isMain && newThreat === 0) {
    return {
      state: {
        ...state,
        schemes: state.schemes.filter((s) => s.id !== schemeId),
      },
      events,
    };
  }
  return {
    state: {
      ...state,
      schemes: state.schemes.map((s) =>
        s.id === schemeId ? { ...s, threat: newThreat } : s,
      ),
    },
    events,
  };
}

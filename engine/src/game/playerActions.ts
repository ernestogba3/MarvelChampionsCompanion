import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { dealDamageToVillain } from "./villainDamage";
import { advanceVillainStage } from "./villainStages";
import { canRemoveThreatFromMainScheme } from "./sideSchemes";
import { canAttackVillain } from "./combat";
import { getScenarioForState } from "../scenarios";
import { isMainSchemeFinalStage } from "./mainScheme";
import { replaceVillainDamage } from "./villainFaces";
import {
  findVillain,
  isMultiVillain,
  removeDefeatedActiveVillain,
  withVillainActive,
} from "./multiVillain";

/**
 * Represalia (Retaliate) N: devuelve N de daño al jugador atacante. Se aplica
 * cuando un jugador inflige daño a un villano/esbirro que tiene Represalia.
 * n indefinido/0 o atacante desconocido → sin efecto. Infraestructura lista
 * para cuando se añadan villanos/esbirros con esta keyword impresa.
 */
function applyRetaliate(
  state: GameState,
  attackerId: string,
  n: number | undefined,
): { state: GameState; events: GameEvent[] } {
  if (n === undefined || n <= 0) {
    return { state, events: [] };
  }
  return {
    state: {
      ...state,
      players: state.players.map((p) =>
        p.id === attackerId ? { ...p, health: Math.max(0, p.health - n) } : p,
      ),
    },
    events: [
      {
        type: "DAMAGE_DEALT",
        targetId: attackerId,
        amount: n,
        source: "retaliate",
      },
    ],
  };
}

/**
 * Un jugador ataca a un villano con `amount` de daño. Por defecto al villano
 * activo; en los escenarios con varios villanos (The Wrecking Crew) se puede
 * elegir cualquiera con `villainId` ("los jugadores pueden atacar a cualquier
 * villano"). Si un villano del grupo cae en su estadio final y quedan otros,
 * sale de juego con su plan propio; si cae el activo, el contador activo pasa
 * al villano con más amenaza en su plan.
 */
export function attackVillain(
  state: GameState,
  playerId: string,
  amount: number,
  villainId?: string,
): { state: GameState; events: GameEvent[] } {
  if (!isMultiVillain(state)) {
    return attackActiveVillain(state, playerId, amount);
  }
  const activeId = state.villain.villainId;
  const targetId = villainId ?? activeId;
  if (targetId === undefined || findVillain(state, targetId) === undefined) {
    return { state, events: [] };
  }
  const attackedActive = targetId === activeId;
  return withVillainActive(state, targetId, (s) => {
    const result = attackActiveVillain(s, playerId, amount);
    const finalStage = getScenarioForState(result.state)?.progression[
      result.state.difficulty
    ].final;
    if (
      result.state.villain.health > 0 ||
      result.state.villain.stage !== finalStage
    ) {
      return result;
    }
    // Derrotado: si era el activo, el contador pasa al de más amenaza; si
    // no, vuelve al que lo tenía antes del ataque.
    const removed = removeDefeatedActiveVillain(
      result.state,
      attackedActive ? undefined : activeId,
    );
    return {
      state: removed.state,
      events: [...result.events, ...removed.events],
    };
  });
}

function attackActiveVillain(
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

  // Inmunidad por Drones (Ultron III): el villano no puede sufrir daño
  // mientras haya un Esbirro Dron en juego. El ataque se anula por completo.
  if (
    state.villain.immuneWhileDronesPresent &&
    state.minions.some((m) => m.isDrone)
  ) {
    return {
      state,
      events: [
        { type: "ATTACK_BLOCKED_BY_DRONES", villainName: state.villain.name },
      ],
    };
  }

  // Interrupción obligada de Norman Osborn (Negocios arriesgados): el daño
  // que iba a sufrir se sustituye por quitar esa misma cantidad de Infamia
  // del Entorno (lo que puede darle la vuelta al Duende Verde). No llega a
  // sufrir daño, así que tampoco hay Represalia ni avance de estadio.
  const replaced = replaceVillainDamage(state, amount);
  if (replaced !== null) {
    return replaced;
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

  const { state: afterDamage, events: damageEvents } = dealDamageToVillain(
    state,
    amount,
  );

  // Represalia: el villano devuelve daño al atacante si la lleva. Ocurre al
  // infligirle daño, antes de comprobar si ha sido derrotado.
  const { state: afterRetaliate, events: retaliateEvents } = applyRetaliate(
    afterDamage,
    playerId,
    afterDamage.villain.retaliate,
  );
  const events = [...damageEvents, ...retaliateEvents];

  if (afterRetaliate.villain.health <= 0) {
    // Al reducir los PG a 0, si el villano NO está en su estadio final (según
    // la dificultad y la definición del escenario), avanza al siguiente
    // estadio. En el estadio final no se avanza: checkGameOutcome lo marca
    // como WIN. Genérico para cualquier villano registrado (ver scenarios/).
    const scenario = getScenarioForState(afterRetaliate);
    if (scenario !== undefined) {
      const finalStage = scenario.progression[afterRetaliate.difficulty].final;
      if (afterRetaliate.villain.stage !== finalStage) {
        const { state: afterStage, events: stageEvents } =
          advanceVillainStage(afterRetaliate);
        return {
          state: afterStage,
          events: [...events, ...stageEvents],
        };
      }
    }
  }

  return { state: afterRetaliate, events };
}

export type GameOutcome = "ONGOING" | "WIN" | "LOSS";

export function checkGameOutcome(state: GameState): GameOutcome {
  const scenario = getScenarioForState(state);
  const mainScheme = state.schemes.find((s) => s.isMain);

  // Completar el plan principal es derrota solo si está en su ETAPA FINAL. En
  // planes de varias etapas (Klaw) una etapa intermedia completada ya habrá
  // avanzado a la siguiente (ver game/mainScheme.ts), así que no debería
  // llegar aquí completa; isMainSchemeFinalStage lo cubre por si acaso. Sin
  // escenario registrado se mantiene el comportamiento original (completar =
  // derrota), porque isMainSchemeFinalStage devuelve true en ese caso.
  if (
    mainScheme &&
    mainScheme.threat >= mainScheme.threatToComplete &&
    isMainSchemeFinalStage(state)
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
  // Con varios villanos (The Wrecking Crew) solo es victoria cuando cae el
  // último: los anteriores salen de juego (reserveVillains se vacía).
  if (
    state.villain.stage === finalStage &&
    state.villain.health <= 0 &&
    (state.reserveVillains?.length ?? 0) === 0
  ) {
    return "WIN";
  }

  return "ONGOING";
}

export function attackMinion(
  state: GameState,
  minionId: string,
  amount: number,
  // Jugador que ataca. Opcional por compatibilidad: solo hace falta para
  // aplicar Represalia del esbirro (devolverle daño). Las llamadas existentes
  // que no lo pasan no activan Represalia (ningún esbirro del Core Set la
  // lleva impresa).
  attackerId?: string,
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
  const defeated = newHealth <= 0;
  let next: GameState = defeated
    ? {
        ...state,
        minions: state.minions.filter((m) => m.id !== minionId),
      }
    : {
        ...state,
        minions: state.minions.map((m) =>
          m.id === minionId ? { ...m, health: newHealth } : m,
        ),
      };
  let events: GameEvent[] = [
    { type: "DAMAGE_DEALT", targetId: minion.id, amount, source: "player" },
  ];
  // Dron derrotado: su carta boca abajo vuelve al descarte de su dueño
  // (el jugador con el que estaba enfrentado).
  if (defeated && minion.isDrone && minion.faceDownCardCode) {
    const ownerId = minion.engagedWith;
    const cardCode = minion.faceDownCardCode;
    next = {
      ...next,
      players: next.players.map((p) =>
        p.id === ownerId
          ? { ...p, discardPile: [...(p.discardPile ?? []), cardCode] }
          : p,
      ),
    };
    events = [
      ...events,
      { type: "DRONE_RETURNED", playerId: ownerId ?? "", cardCode },
    ];
  }
  // Represalia del esbirro: solo si conocemos al atacante y el esbirro la lleva.
  if (attackerId !== undefined) {
    const { state: afterRetaliate, events: retaliateEvents } = applyRetaliate(
      next,
      attackerId,
      minion.retaliate,
    );
    next = afterRetaliate;
    events = [...events, ...retaliateEvents];
  }
  return { state: next, events };
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
  // Un plan secundario sin amenaza se descarta, salvo los planes propios de un
  // villano (The Wrecking Crew): "no puede salir de juego mientras [su
  // villano] esté en juego".
  if (!scheme.isMain && newThreat === 0 && scheme.villainId === undefined) {
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

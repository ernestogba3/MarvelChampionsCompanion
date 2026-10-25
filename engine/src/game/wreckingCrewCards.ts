import type { GameState, SchemeState, VillainState } from "../domain/types";
import type { GameEvent } from "../events/types";
import type { Effect } from "../effects/types";
import { applyEffects } from "../effects/applyEffect";
import { villainAttacks, villainSchemes } from "./villainActivation";
import {
  findVillain,
  moveActiveVillain,
  ownSideScheme,
  pickVillainBySideSchemeThreat,
  resolveSignatureSchemeOverflows,
} from "./multiVillain";
import { millPlayerDeck } from "./playerLibrary";

// "Cuando se muestre esta carta" del pack The Wrecking Crew que el motor
// resuelve solo (los que no dependen de aliados, mejoras, mano ni estados que
// el motor no modela). Cuando la carta deja elegir entre planes empatados, el
// motor toma el primero en juego; el jugador puede corregirlo a mano.

type Result = { state: GameState; events: GameEvent[] };

function isHero(state: GameState, playerId: string): boolean {
  return state.players.find((p) => p.id === playerId)?.form === "HERO";
}

/** El villano ataca al jugador (en forma de Héroe) o maquina (en alter ego). */
function attackOrScheme(
  state: GameState,
  villain: VillainState,
  playerId: string,
  bonus = 0,
): Result & { amount: number } {
  if (isHero(state, playerId)) {
    const r = villainAttacks(state, villain, playerId, { bonus });
    return { state: r.state, events: r.events, amount: r.damage };
  }
  const r = villainSchemes(state, villain, { bonus });
  return { state: r.state, events: r.events, amount: r.threat };
}

function sideSchemes(state: GameState): SchemeState[] {
  return state.schemes.filter((s) => !s.isMain);
}

/** Plan secundario con más (MOST) o menos (LEAST) amenaza; empate → el primero. */
function sideSchemeBy(
  state: GameState,
  which: "MOST" | "LEAST",
): SchemeState | undefined {
  let best: SchemeState | undefined;
  for (const s of sideSchemes(state)) {
    if (
      best === undefined ||
      (which === "MOST" ? s.threat > best.threat : s.threat < best.threat)
    ) {
      best = s;
    }
  }
  return best;
}

/**
 * Lanzamiento de palanca (07012): Destructor maquina (alter ego) o te ataca
 * (Héroe). Luego el contador activo pasa al villano con menos amenaza en su
 * plan.
 */
export function resolveCrowbarToss(state: GameState, playerId: string): Result {
  const wrecker = findVillain(state, "wrecker");
  const acted =
    wrecker !== undefined
      ? attackOrScheme(state, wrecker, playerId)
      : { state, events: [] };
  const moved = moveActiveVillain(acted.state, "LEAST");
  return { state: moved.state, events: [...acted.events, ...moved.events] };
}

/**
 * ¡Destrozadlos! (07013/07028/07040/07057): en alter ego maquina el villano
 * con más amenaza en su plan; en Héroe te ataca el que tenga menos.
 */
export function resolveGetWrecked(state: GameState, playerId: string): Result {
  const hero = isHero(state, playerId);
  const pick = pickVillainBySideSchemeThreat(state, hero ? "LEAST" : "MOST");
  const villain =
    pick !== undefined ? findVillain(state, pick.villainId) : undefined;
  if (villain === undefined) return { state, events: [] };
  return attackOrScheme(state, villain, playerId);
}

/**
 * ¡Lo estaba deseando! (07014/07029/07041, con la errata oficial de "gana" a
 * "se cura"): el villano activo se cura 3 y recibe un estado Resistente.
 */
export function resolveIveBeenWaiting(state: GameState): Result {
  return applyEffects(state, [
    {
      type: "HEAL",
      target: { kind: "VILLAIN" },
      amount: 3,
      source: "¡Lo estaba deseando!",
    },
    { type: "GAIN_STATUS", target: { kind: "VILLAIN" }, status: "TOUGH" },
  ]);
}

/** Vínculo místico (07015): 2 de amenaza en cada plan secundario. */
export function resolveMysticalLink(state: GameState): Result {
  return applyEffects(
    state,
    sideSchemes(state).map(
      (s): Effect => ({
        type: "ADD_THREAT",
        target: { kind: "SCHEME", schemeId: s.id },
        amount: 2,
      }),
    ),
  );
}

/**
 * Proyectiles de energía (07027): 1 de daño a cada personaje amigo que
 * controles (a la identidad: el motor no modela aliados).
 */
export function resolveEnergyProjectiles(
  state: GameState,
  playerId: string,
): Result {
  return applyEffects(state, [
    {
      type: "DEAL_DAMAGE",
      target: { kind: "PLAYER", playerId },
      amount: 1,
      source: "Proyectiles de energía",
    },
  ]);
}

/**
 * Descarga energética (07030): en alter ego, 3 de amenaza en el plan
 * secundario con más amenaza; en Héroe, Bola de Trueno te ataca y, como el
 * ataque no es defendido (el motor no modela defensores), 3 de amenaza en su
 * plan.
 */
export function resolveLightningBlast(
  state: GameState,
  playerId: string,
): Result {
  if (!isHero(state, playerId)) {
    const target = sideSchemeBy(state, "MOST");
    if (target === undefined) return { state, events: [] };
    return applyEffects(state, [
      {
        type: "ADD_THREAT",
        target: { kind: "SCHEME", schemeId: target.id },
        amount: 3,
      },
    ]);
  }
  const thunderball = findVillain(state, "thunderball");
  if (thunderball === undefined) return { state, events: [] };
  const attacked = villainAttacks(state, thunderball, playerId);
  const own = ownSideScheme(attacked.state, "thunderball");
  if (own === undefined) return attacked;
  const placed = applyEffects(attacked.state, [
    {
      type: "ADD_THREAT",
      target: { kind: "SCHEME", schemeId: own.id },
      amount: 3,
    },
  ]);
  return { state: placed.state, events: [...attacked.events, ...placed.events] };
}

/**
 * Destreza táctica (07031): mueve toda la amenaza del plan secundario con
 * menos amenaza al que tenga más. Si la Respuesta obligada de ese plan no se
 * dispara así, la carta gana Oleada.
 */
export function resolveTacticalProwess(state: GameState): Result {
  const from = sideSchemeBy(state, "LEAST");
  const to = sideSchemeBy(state, "MOST");
  let current = state;
  const events: GameEvent[] = [];
  if (from !== undefined && to !== undefined && from.id !== to.id) {
    const moved = from.threat;
    current = {
      ...current,
      schemes: current.schemes
        .map((s) => {
          if (s.id === from.id) return { ...s, threat: 0 };
          if (s.id === to.id) return { ...s, threat: s.threat + moved };
          return s;
        })
        // Un plan secundario normal sin amenaza se descarta; los propios de
        // un villano no salen de juego.
        .filter(
          (s) => !(s.id === from.id && s.villainId === undefined && moved > 0),
        ),
    };
    events.push(
      { type: "THREAT_REMOVED", schemeId: from.id, amount: moved },
      { type: "THREAT_ADDED", schemeId: to.id, amount: moved },
    );
  }
  const overflow = resolveSignatureSchemeOverflows(current);
  current = overflow.state;
  events.push(...overflow.events);
  const triggered = overflow.events.some(
    (e) => e.type === "SIGNATURE_SCHEME_TRIGGERED" && e.schemeId === to?.id,
  );
  if (!triggered) {
    events.push({ type: "CARD_GAINED_SURGE", cardName: "Destreza táctica" });
  }
  return { state: current, events };
}

/**
 * Aporrear (07044): Martinete maquina (alter ego) o te ataca (Héroe), con +2
 * de PLA/ATQ si es Resistente.
 */
export function resolvePummel(state: GameState, playerId: string): Result {
  const piledriver = findVillain(state, "piledriver");
  if (piledriver === undefined) return { state, events: [] };
  return attackOrScheme(state, piledriver, playerId, piledriver.tough ? 2 : 0);
}

/**
 * Acometida (07055): Bulldozer maquina (alter ego) o te ataca (Héroe); luego
 * descartas de tu mazo 1 carta por cada punto de amenaza colocada / daño
 * infligido.
 */
export function resolveBullRush(state: GameState, playerId: string): Result {
  const bulldozer = findVillain(state, "bulldozer");
  if (bulldozer === undefined) return { state, events: [] };
  const acted = attackOrScheme(state, bulldozer, playerId);
  const milled = millPlayerDeck(acted.state, playerId, acted.amount);
  return { state: milled.state, events: [...acted.events, ...milled.events] };
}

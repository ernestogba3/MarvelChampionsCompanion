import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import {
  resolveImTough,
  resolveHardToKeepDown,
  resolveStampede,
} from "./villainTreacheries";
import { resolveShockerReveal } from "./encounterEffects";
import {
  resolveAdvance,
  resolveAssault,
  resolveCaughtOffGuard,
  resolveGangUp,
  resolveShadowOfThePast,
} from "./standardSet";
import {
  resolveAllInADaysWork,
  resolveGoblinReinforcements,
  resolveOscorpManufacturing,
} from "./greenGoblinCards";
import {
  resolveBullRush,
  resolveCrowbarToss,
  resolveEnergyProjectiles,
  resolveGetWrecked,
  resolveIveBeenWaiting,
  resolveLightningBlast,
  resolveMysticalLink,
  resolvePummel,
  resolveTacticalProwess,
} from "./wreckingCrewCards";
type RevealResolver = (
  state: GameState,
  playerId: string,
) => { state: GameState; events: GameEvent[] };
const REVEAL_RESOLVERS: Record<string, RevealResolver> = {
  "01103": (state) => resolveShockerReveal(state),
  "01104": (state) => resolveHardToKeepDown(state),
  "01105": (state) => resolveImTough(state),
  "01106": (state, playerId) => resolveStampede(state, playerId),
  "01186": (state) => resolveAdvance(state),
  "01187": (state, playerId) => resolveAssault(state, playerId),
  "01188": (state, playerId) => resolveCaughtOffGuard(state, playerId),
  "01189": (state, playerId) => resolveGangUp(state, playerId),
  "01190": (state) => resolveShadowOfThePast(state),
  "02010": (state) => resolveOscorpManufacturing(state),
  "02012": (state) => resolveAllInADaysWork(state),
  "02026": (state) => resolveGoblinReinforcements(state),
  "07012": (state, playerId) => resolveCrowbarToss(state, playerId),
  "07013": (state, playerId) => resolveGetWrecked(state, playerId),
  "07028": (state, playerId) => resolveGetWrecked(state, playerId),
  "07040": (state, playerId) => resolveGetWrecked(state, playerId),
  "07057": (state, playerId) => resolveGetWrecked(state, playerId),
  "07014": (state) => resolveIveBeenWaiting(state),
  "07029": (state) => resolveIveBeenWaiting(state),
  "07041": (state) => resolveIveBeenWaiting(state),
  "07015": (state) => resolveMysticalLink(state),
  "07027": (state, playerId) => resolveEnergyProjectiles(state, playerId),
  "07030": (state, playerId) => resolveLightningBlast(state, playerId),
  "07031": (state) => resolveTacticalProwess(state),
  "07044": (state, playerId) => resolvePummel(state, playerId),
  "07055": (state, playerId) => resolveBullRush(state, playerId),
};

/** Cartas con "Cuando se muestre" que el motor resuelve solo. */
export function hasRevealResolver(cardId: string): boolean {
  return cardId in REVEAL_RESOLVERS;
}
export function resolveRevealedCard(
  state: GameState,
  cardId: string,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const resolver = REVEAL_RESOLVERS[cardId];
  if (!resolver) {
    throw new Error(
      `No hay resolución de "al revelarse" registrada para la carta ${cardId}`,
    );
  }
  return resolver(state, playerId);
}

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
};
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

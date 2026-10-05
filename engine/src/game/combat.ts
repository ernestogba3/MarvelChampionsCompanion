import type { GameState } from "../domain/types.ts";
export function canAttackVillain(state: GameState, playerId: string): boolean {
  return !state.minions.some((m) => m.engagedWith === playerId && m.guard);
}

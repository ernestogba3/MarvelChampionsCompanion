import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
export function resolveVillainActivation(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Jugador no encontrado: ${playerId}`);
  }
  if (player.form === "HERO") {
    const amount = state.villain.attack;
    const { state: afterEffects, events: effectEvents } = applyEffects(state, [
      {
        type: "DEAL_DAMAGE",
        target: { kind: "PLAYER", playerId },
        amount,
        source: "villain",
      },
      { type: "QUEUE_ENCOUNTER_CARD", playerId },
    ]);
    return {
      state: afterEffects,
      events: [{ type: "VILLAIN_ATTACKED", playerId, amount }, ...effectEvents],
    };
  }
  const mainScheme = state.schemes.find((s) => s.isMain)!;
  const amount = state.villain.scheme;
  const { state: afterEffects, events: effectEvents } = applyEffects(state, [
    { type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount },
  ]);
  return {
    state: afterEffects,
    events: [
      { type: "VILLAIN_SCHEMED", schemeId: mainScheme.id, amount },
      ...effectEvents,
    ],
  };
}

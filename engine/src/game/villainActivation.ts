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
  let currentState = state;
  let events: GameEvent[] = [];
  if (player.form === "HERO") {
    const amount = state.villain.attack;
    const { state: afterEffects, events: effectEvents } = applyEffects(
      currentState,
      [
        {
          type: "DEAL_DAMAGE",
          target: { kind: "PLAYER", playerId },
          amount,
          source: "villain",
        },
        { type: "QUEUE_ENCOUNTER_CARD", playerId },
      ],
    );
    currentState = afterEffects;
    events = [{ type: "VILLAIN_ATTACKED", playerId, amount }, ...effectEvents];
  } else {
    const mainScheme = currentState.schemes.find((s) => s.isMain)!;
    const amount = currentState.villain.scheme;
    const { state: afterEffects, events: effectEvents } = applyEffects(
      currentState,
      [{ type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount }],
    );
    currentState = afterEffects;
    events = [
      { type: "VILLAIN_SCHEMED", schemeId: mainScheme.id, amount },
      ...effectEvents,
    ];
  }
  const engagedMinions = currentState.minions.filter(
    (m) => m.engagedWith === playerId,
  );
  for (const minion of engagedMinions) {
    const { state: afterMinion, events: minionEvents } = applyEffects(
      currentState,
      [
        {
          type: "DEAL_DAMAGE",
          target: { kind: "PLAYER", playerId },
          amount: minion.attack,
          source: minion.name,
        },
        { type: "QUEUE_ENCOUNTER_CARD", playerId },
      ],
    );
    currentState = afterMinion;
    events = [...events, ...minionEvents];
  }
  return { state: currentState, events };
}

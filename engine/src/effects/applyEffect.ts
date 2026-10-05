import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import type { Effect } from "./types";
export function applyEffect(
  state: GameState,
  effect: Effect,
): { state: GameState; events: GameEvent[] } {
  switch (effect.type) {
    case "DEAL_DAMAGE": {
      if (effect.target.kind === "VILLAIN") {
        const suit = state.villain.attachments.find(
          (a) => a.name === "Piel blindada del Rino",
        );
        if (suit) {
          const newDamage = suit.damageAbsorbed + effect.amount;
          const events: GameEvent[] = [
            {
              type: "DAMAGE_REDIRECTED",
              toAttachmentId: suit.id,
              amount: effect.amount,
            },
          ];
          let attachments = state.villain.attachments.map((a) =>
            a.id === suit.id ? { ...a, damageAbsorbed: newDamage } : a,
          );
          if (newDamage >= 5) {
            events.push({
              type: "ATTACHMENT_DISCARDED",
              attachmentId: suit.id,
            });
            attachments = attachments.filter((a) => a.id !== suit.id);
          }
          return {
            state: { ...state, villain: { ...state.villain, attachments } },
            events,
          };
        }
        const newHealth = Math.max(0, state.villain.health - effect.amount);
        return {
          state: { ...state, villain: { ...state.villain, health: newHealth } },
          events: [
            {
              type: "DAMAGE_DEALT",
              targetId: "villain",
              amount: effect.amount,
              source: effect.source,
            },
          ],
        };
      }
      if (effect.target.kind === "PLAYER") {
        const pid = effect.target.playerId;
        return {
          state: {
            ...state,
            players: state.players.map((p) =>
              p.id === pid
                ? { ...p, health: Math.max(0, p.health - effect.amount) }
                : p,
            ),
          },
          events: [
            {
              type: "DAMAGE_DEALT",
              targetId: pid,
              amount: effect.amount,
              source: effect.source,
            },
          ],
        };
      }
      return { state, events: [] };
    }
    case "HEAL": {
      if (effect.target.kind === "VILLAIN") {
        const healed = Math.min(
          effect.amount,
          state.villain.maxHealth - state.villain.health,
        );
        return {
          state: {
            ...state,
            villain: {
              ...state.villain,
              health: state.villain.health + healed,
            },
          },
          events: [
            {
              type: "HEALTH_HEALED",
              targetId: "villain",
              amount: healed,
              source: effect.source,
            },
          ],
        };
      }
      return { state, events: [] };
    }
    case "ADD_THREAT": {
      if (effect.target.kind === "MAIN_SCHEME") {
        const scheme = state.schemes.find((s) => s.isMain)!;
        return {
          state: {
            ...state,
            schemes: state.schemes.map((s) =>
              s.id === scheme.id
                ? { ...s, threat: s.threat + effect.amount }
                : s,
            ),
          },
          events: [
            {
              type: "THREAT_ADDED",
              schemeId: scheme.id,
              amount: effect.amount,
            },
          ],
        };
      }
      if (effect.target.kind === "SCHEME") {
        return {
          state: {
            ...state,
            schemes: state.schemes.map((s) =>
              s.id === effect.target.schemeId
                ? { ...s, threat: s.threat + effect.amount }
                : s,
            ),
          },
          events: [
            {
              type: "THREAT_ADDED",
              schemeId: effect.target.schemeId,
              amount: effect.amount,
            },
          ],
        };
      }
      return { state, events: [] };
    }
    case "GAIN_STATUS": {
      if (effect.target.kind === "VILLAIN" && effect.status === "TOUGH") {
        return {
          state: { ...state, villain: { ...state.villain, tough: true } },
          events: [
            { type: "STATUS_GAINED", targetId: "villain", status: "TOUGH" },
          ],
        };
      }
      if (effect.target.kind === "PLAYER" && effect.status === "STUNNED") {
        const pid = effect.target.playerId;
        return {
          state: {
            ...state,
            players: state.players.map((p) =>
              p.id === pid ? { ...p, stunned: true } : p,
            ),
          },
          events: [{ type: "STATUS_GAINED", targetId: pid, status: "STUNNED" }],
        };
      }
      return { state, events: [] };
    }
    case "GAIN_SURGE": {
      return {
        state,
        events: [{ type: "CARD_GAINED_SURGE", cardName: effect.cardName }],
      };
    }
    case "QUEUE_ENCOUNTER_CARD": {
      return {
        state: {
          ...state,
          pendingEncounterDeals: [
            ...state.pendingEncounterDeals,
            effect.playerId,
          ],
        },
        events: [],
      };
    }
    case "DISCARD_UPGRADE": {
      return {
        state: {
          ...state,
          players: state.players.map((p) =>
            p.id === effect.playerId
              ? {
                  ...p,
                  upgradesInPlay: p.upgradesInPlay.filter(
                    (u) => u !== effect.upgradeId,
                  ),
                }
              : p,
          ),
        },
        events: [
          {
            type: "UPGRADE_DISCARDED",
            playerId: effect.playerId,
            upgradeId: effect.upgradeId,
          },
        ],
      };
    }
    default:
      return { state, events: [] };
  }
}
export function applyEffects(
  state: GameState,
  effects: Effect[],
): { state: GameState; events: GameEvent[] } {
  let currentState = state;
  const allEvents: GameEvent[] = [];
  for (const effect of effects) {
    const result = applyEffect(currentState, effect);
    currentState = result.state;
    allEvents.push(...result.events);
  }
  return { state: currentState, events: allEvents };
}

import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { getCardDefinition } from "../data/cards";
import { createHydraMercenary, createSandman, createShocker } from "./minions";
import {
  createArmoredRhinoSuit,
  createCharge,
  createEnhancedIvoryHorn,
} from "./attachments";
const MINION_FACTORIES: Record<
  string,
  (id: string, engagedWith: string | null) => ReturnType<typeof createSandman>
> = {
  "01101": createHydraMercenary,
  "01102": createSandman,
  "01103": createShocker,
};
const ATTACHMENT_FACTORIES: Record<
  string,
  (id: string) => ReturnType<typeof createCharge>
> = {
  "01098": createArmoredRhinoSuit,
  "01099": createCharge,
  "01100": createEnhancedIvoryHorn,
};
export function putCardIntoPlay(
  state: GameState,
  cardId: string,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const def = getCardDefinition(cardId);
  if (!def) {
    return { state, events: [] };
  }
  if (def.type === "MINION") {
    const factory = MINION_FACTORIES[cardId];
    const minion = factory
      ? factory(`${cardId}-${state.minions.length}`, playerId)
      : {
          id: `${cardId}-${state.minions.length}`,
          cardId,
          name: def.nameEs,
          attack: def.attack ?? 0,
          scheme: def.scheme ?? 0,
          health: def.health ?? 1,
          maxHealth: def.health ?? 1,
          engagedWith: playerId,
          tough: false,
          guard: false,
        };
    return {
      state: { ...state, minions: [...state.minions, minion] },
      events: [],
    };
  }
  if (def.type === "ATTACHMENT") {
    const factory = ATTACHMENT_FACTORIES[cardId];
    if (!factory) return { state, events: [] };
    const attachment = factory(`${cardId}-${state.villain.attachments.length}`);
    return {
      state: {
        ...state,
        villain: {
          ...state.villain,
          attachments: [...state.villain.attachments, attachment],
        },
      },
      events: [],
    };
  }
  if (def.type === "SIDE_SCHEME") {
    const scheme = {
      id: `${cardId}-side`,
      name: def.nameEs,
      threat: def.startingThreat ?? 0,
      threatToComplete: 0,
      escalationThreat: 0,
      isMain: false,
    };
    return {
      state: { ...state, schemes: [...state.schemes, scheme] },
      events: [
        { type: "SIDE_SCHEME_ENTERED", schemeId: scheme.id, name: scheme.name },
      ],
    };
  }
  return { state, events: [] };
}

export const ping = () => "engine ok";
export { createSpiderManVsRhinoGame, createRhinoGame } from "./createGame";
export type { PlayerSetup } from "./createGame";
export {
  serializeGameState,
  deserializeGameState,
} from "../persistence/serialize";
export { advanceToNextStep } from "./advancePhase";
export { addThreatStep } from "./addThreat";
export { resolveVillainActivation } from "./villainActivation";
export { dealPendingEncounterCards } from "./dealEncounterCards";
export { describeCurrentStep } from "../explanations/stepGuide";
export { explainRecentEvents } from "../explanations/explainEvent";
export { runAndLog } from "../events/log";
export type { GameState, PlayerForm } from "../domain/types";
export type { RuleExplanation } from "../explanations/types";
export { revealPendingCardsForPlayer } from "./revealEncounterCards";
export {
  attackVillain,
  attackMinion,
  thwartScheme,
  checkGameOutcome,
} from "./playerActions";
export type { GameOutcome } from "./playerActions";
export { canAttackVillain } from "./combat";
export { CARD_CATALOG, getCardDefinition } from "../data/cards";
export type { CardDefinition, CardType, EncounterSet } from "../data/cards";

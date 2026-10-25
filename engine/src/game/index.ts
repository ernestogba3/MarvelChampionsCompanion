export const ping = () => "engine ok";
export {
  createGame,
  createSpiderManVsRhinoGame,
  createRhinoGame,
} from "./createGame";
export type { PlayerSetup } from "./createGame";
export {
  getScenario,
  getScenarioByVillainName,
  getScenarioForState,
  ALL_SCENARIOS,
} from "../scenarios";
export type {
  ScenarioDefinition,
  VillainStageDefinition,
  VillainFaceAbilities,
  VillainFlipSideDefinition,
  RevealDamage,
  ScenarioMainScheme,
  MainSchemeCompletionEffect,
  ScenarioSideScheme,
  ScenarioEnvironmentDefinition,
  EnvironmentFaceDefinition,
  StageProgression,
  ScenarioVillainDefinition,
  SignatureSchemeDefinition,
} from "../scenarios";
export {
  activeVillainFace,
  adjustEnvironmentCounters,
  placeOrElseRemoveEnvironmentCounters,
  flipVillainAndEnvironment,
  faceForNextStage,
} from "./villainFaces";
export type { VillainFace } from "./villainFaces";
export { putEncounterMinionIntoPlay } from "./putCardIntoPlay";
export {
  isMultiVillain,
  allVillains,
  findVillain,
  ownSideScheme,
  setActiveVillain,
  moveActiveVillain,
  addThreatToScheme,
} from "./multiVillain";
export { villainAttacks, villainSchemes } from "./villainActivation";
export {
  mainSchemeThreatPerRound,
  countEnemiesWithTrait,
} from "./mainScheme";
export {
  serializeGameState,
  deserializeGameState,
} from "../persistence/serialize";
export { advanceToNextStep } from "./advancePhase";
export { addThreatStep } from "./addThreat";
export {
  advanceMainSchemeIfComplete,
  isMainSchemeFinalStage,
} from "./mainScheme";
export {
  createDrone,
  droneCount,
  DRONE_BASE_ATTACK,
  DRONE_BASE_SCHEME,
  DRONE_BASE_HEALTH,
} from "./drones";
export { resolveVillainActivation } from "./villainActivation";
export { dealPendingEncounterCards } from "./dealEncounterCards";
export { describeCurrentStep } from "../explanations/stepGuide";
export { explainRecentEvents } from "../explanations/explainEvent";
export { runAndLog } from "../events/log";
export type {
  GameState,
  PlayerForm,
  CardFace,
  EnvironmentState,
  ReserveVillainState,
  VillainState,
  SchemeState,
} from "../domain/types";
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
export {
  validateDeck,
  ASPECT_FACTIONS,
  BASIC_FACTION,
  HERO_FACTION,
  DECK_MIN_CARDS,
  DECK_MAX_CARDS,
} from "../deck/deckRules";
export type {
  AspectFaction,
  DeckCardInfo,
  CardIndex,
  DeckDefinition,
  MissingCopies,
  DeckValidation,
} from "../deck/deckRules";
export { buildPackDeck, packAspects, deckSize } from "../deck/packDeck";
export type { PackCardInfo } from "../deck/packDeck";
// --- Biblioteca simulada del jugador ---
export {
  initPlayerLibrary,
  drawCards,
  drawToHandSize,
  playCardFromHand,
  discardCardFromHand,
  millPlayerDeck,
  expandDeckCards,
  hasSimulatedLibrary,
  noShuffle,
  DEFAULT_HAND_SIZE,
} from "./playerLibrary";
export type { Shuffle } from "./playerLibrary";

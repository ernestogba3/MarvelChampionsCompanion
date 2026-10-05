export type PlayerForm = "HERO" | "ALTER_EGO";
export interface PlayerState {
  id: string;
  heroName: string;
  form: PlayerForm;
  health: number;
  maxHealth: number;
  faceDownEncounterCards: string[];
  stunned: boolean;
  upgradesInPlay: string[];
}
export type VillainStage = "I" | "II" | "III";
export interface VillainAttachmentState {
  id: string;
  cardId: string;
  name: string;
  damageAbsorbed: number;
  active: boolean;
}
export interface VillainState {
  name: string;
  stage: VillainStage;
  health: number;
  maxHealth: number;
  attack: number;
  scheme: number;
  tough: boolean;
  attachments: VillainAttachmentState[];
}
export interface SchemeState {
  id: string;
  name: string;
  threat: number;
  threatToComplete: number;
  escalationThreat: number;
  isMain: boolean;
}
export interface MinionState {
  id: string;
  cardId: string;
  name: string;
  attack: number;
  scheme: number;
  health: number;
  maxHealth: number;
  engagedWith: string | null;
  tough: boolean;
  guard: boolean;
}
export interface NemesisSet {
  heroName: string;
  minionCardId: string;
  minionName: string;
  sideSchemeCardId: string;
  sideSchemeName: string;
  remainingCardIds: string[];
}
export type VillainPhaseStep =
  | "ADD_THREAT"
  | "VILLAIN_ACTIVATION"
  | "DEAL_ENCOUNTER_CARDS"
  | "REVEAL_ENCOUNTER_CARDS"
  | "PASS_FIRST_PLAYER";
export type GamePhase =
  | { name: "PLAYER_PHASE" }
  | { name: "VILLAIN_PHASE"; step: VillainPhaseStep };
export interface GameState {
  round: number;
  phase: GamePhase;
  firstPlayerId: string;
  players: PlayerState[];
  villain: VillainState;
  schemes: SchemeState[];
  minions: MinionState[];
  encounterDeck: string[];
  encounterDiscard: string[];
  pendingEncounterDeals: string[];
  reservedNemesis: NemesisSet | null;
}

import type { GameEvent } from "../events/types";

export type PlayerForm = "HERO" | "ALTER_EGO";

export type Difficulty = "STANDARD" | "EXPERT";

export interface PlayerState {
  id: string;
  heroName: string;
  alterEgoName: string;
  form: PlayerForm;
  health: number;
  maxHealth: number;
  faceDownEncounterCards: string[];
  stunned: boolean;
  upgradesInPlay: string[];
  // IDs de marvelcdb para la ilustración de cada cara de la identidad
  // (p.ej. "01001a" héroe / "01001b" alter ego de Spider-Man/Peter Parker).
  // Opcionales a propósito: partidas guardadas antiguas y jugadores sin ID
  // introducido simplemente no muestran miniatura, sin romper nada.
  heroCardId?: string;
  alterEgoCardId?: string;
}

export type VillainStage = "I" | "II" | "III";

export interface VillainAttachmentState {
  id: string;
  cardId: string;
  name: string;
  damageAbsorbed: number;
  active: boolean;
  redirectsDamage: boolean;
  damageCapacity: number;
  attackBonus: number;
  discardAfterAttack: boolean;
}

export interface VillainState {
  cardId: string;
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
  cardId: string;
  name: string;
  threat: number;
  threatToComplete: number;
  escalationThreat: number;
  isMain: boolean;
  // Tokens de aceleración permanentes. Se añade 1 cada vez que el mazo de
  // encuentros se agota y hay que barajar el descarte (penalización oficial
  // del Rules Reference). Se suma de forma fija (no multiplicada por nº de
  // jugadores) a la amenaza que se añade cada ronda. Solo aplica al plan
  // principal.
  accelerationTokens: number;
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
  difficulty: Difficulty;
  firstPlayerId: string;
  players: PlayerState[];
  villain: VillainState;
  schemes: SchemeState[];
  minions: MinionState[];
  encounterDeck: string[];
  encounterDiscard: string[];
  pendingEncounterDeals: string[];
  reservedNemesis: NemesisSet | null;
  eventLog: GameEvent[];
}

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
  // ID del mazo guardado que este jugador trae a la partida (ver
  // mobile/storage/gameStorage.ts → tabla "decks"). Opcional: el motor NO
  // simula todavía la biblioteca del jugador, pero el ID viaja con el
  // GameState para que la app companion sepa qué cartas tiene cada jugador
  // (y para cuando el motor empiece a modelarlo). Partidas guardadas antes
  // de esta sesión simplemente no lo traen y siguen cargándose igual.
  deckId?: string;
  // Biblioteca simulada del jugador. undefined = jugador sin mazo asignado
  // (partidas antiguas o partidas iniciadas sin elegir mazo); la app ignora
  // el robo para ese jugador en lugar de romper. Al iniciar la partida con
  // mazo, initPlayerLibrary() baraja las cartas y las coloca aquí.
  library?: string[]; // IDs de carta ordenados (índice 0 = cima)
  hand?: string[]; // cartas actualmente en mano
  discardPile?: string[]; // pila de descarte (visible, boca arriba)
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
  // Represalia (Retaliate) N: cuando un jugador le inflige daño, recibe N de
  // daño de vuelta. Opcional: sin valor (o 0) = sin Represalia. Ningún villano
  // del Core Set la lleva impresa (a Klaw se la daría un acople, aún no
  // modelado); el campo es infraestructura lista para villanos que la tengan.
  retaliate?: number;
  // Ultron III: no puede sufrir daño mientras haya un Esbirro Dron en juego.
  immuneWhileDronesPresent?: boolean;
  // Bonus +N de ATQ/PG que reciben los Drones por el estadio del villano
  // (Ultron III = 1). El bonus del acople "Drones mejorados" NO se incluye
  // aquí (se aplica a mano). undefined/0 = sin bonus.
  droneBonus?: number;
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
  // Represalia (Retaliate) N: cuando un jugador le inflige daño, recibe N de
  // daño de vuelta. Opcional (infraestructura); los esbirros del Core Set no
  // la llevan impresa.
  retaliate?: number;
  // Esbirro Dron (Ultron): se crea poniendo boca abajo la carta superior de la
  // biblioteca del jugador. Al ser derrotado, esa carta vuelve al descarte de
  // su dueño (engagedWith). Los drones escalan con villain.droneBonus.
  isDrone?: boolean;
  // Código de la carta puesta boca abajo que representa este dron (para
  // devolverla al descarte del dueño al derrotarlo).
  faceDownCardCode?: string;
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

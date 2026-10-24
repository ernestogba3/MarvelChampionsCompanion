import type { Difficulty, VillainStage } from "../domain/types";

/**
 * Un plan secundario que entra en juego al alcanzar (o empezar en) cierto
 * estadio del villano. Mismos campos que un SchemeState del motor.
 */
export interface ScenarioSideScheme {
  id: string;
  cardId: string;
  name: string;
  threat: number;
  threatToComplete: number;
  escalationThreat: number;
  accelerationTokens: number;
}

/**
 * Definición de un estadio del villano (I, II, III). Los PG se expresan POR
 * JUGADOR: el motor los multiplica por el nº de jugadores al construir el
 * estado (confirmado contra el RRG v1.7 / datos per-player de marvelcdb).
 */
export interface VillainStageDefinition {
  stage: VillainStage;
  cardId: string;
  attack: number;
  scheme: number;
  healthPerPlayer: number;
  /** Entra en juego con Resistente (status Tough). */
  tough: boolean;
  /** Habilidad "al revelarse": aturde a todos los héroes. */
  stunAllOnReveal: boolean;
  /**
   * Ultron III: el villano no puede sufrir daño mientras haya un Esbirro Dron
   * en juego. Opcional, por defecto false.
   */
  immuneWhileDronesPresent?: boolean;
  /**
   * Bonus +N de ATQ/PG que reciben los Drones en este estadio (Ultron III = 1).
   * Opcional, por defecto 0.
   */
  droneBonus?: number;
  /**
   * Si al entrar en este estadio se descartan las cartas acopladas al villano.
   * Rino III las descarta; Rino II las conserva (comportamiento del motor
   * original, reproducido fielmente aquí).
   */
  clearAttachmentsOnEnter: boolean;
  /** Planes secundarios que entran al alcanzar/empezar en este estadio. */
  sideSchemesOnEnter: ScenarioSideScheme[];
}

/**
 * Plan principal del escenario. threatToCompletePerPlayer se multiplica por el
 * nº de jugadores; la amenaza inicial y la aceleración impresa NO (la
 * aceleración se multiplica aparte, en addThreatStep).
 */
export interface ScenarioMainScheme {
  id: string;
  cardId: string;
  name: string;
  startingThreat: number;
  escalationThreat: number;
  threatToCompletePerPlayer: number;
}

export interface StageProgression {
  /** Estadio en el que empieza la partida con esta dificultad. */
  start: VillainStage;
  /** Estadio final: derrotarlo es la victoria. */
  final: VillainStage;
}

/**
 * Definición completa de un escenario (un villano). Todo lo específico del
 * villano vive aquí como datos; el motor es genérico.
 *
 * La clave de búsqueda en tiempo de ejecución es `villainName`, que coincide
 * con `state.villain.name` (estable a través de los estadios). Así el motor
 * recupera la definición desde cualquier GameState sin necesidad de guardar
 * campos nuevos en el estado ni tocar la (de)serialización.
 */
export interface ScenarioDefinition {
  id: string;
  villainName: string;
  /** Etapa INICIAL del plan principal. */
  mainScheme: ScenarioMainScheme;
  /**
   * Etapas SIGUIENTES del plan principal, en orden, para planes de varias
   * etapas (p.ej. Klaw: "Reunión secreta" tras "Distribución clandestina").
   * Cuando la etapa activa alcanza su umbral y hay una siguiente, el motor
   * avanza a ella (advanceMainSchemeIfComplete); completar la ÚLTIMA etapa es
   * la derrota. Omitir (o lista vacía) = plan de una sola etapa (Rino):
   * completarla es la derrota directamente.
   */
  additionalMainSchemeStages?: ScenarioMainScheme[];
  /** Estadios en orden I → II → III. */
  stages: VillainStageDefinition[];
  progression: Record<Difficulty, StageProgression>;
  encounterDeck: string[];
  /**
   * Cuántas cartas de aumento (boost) roba el villano en CADA activación.
   * Casi todos los villanos roban 1; Klaw roba 2 (su Interrupción obligada:
   * "cuando Klaw ataque, dale 1 carta de aumento adicional"). villainActivation
   * lee este valor; por defecto 1 si el escenario no se encuentra.
   */
  boostCardsPerActivation: number;
}

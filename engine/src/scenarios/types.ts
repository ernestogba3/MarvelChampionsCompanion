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
 * Daño de una habilidad "Cuando se muestre esta carta" del villano (Duende
 * Verde de Negocios arriesgados). `indirect`: el jugador puede repartirlo
 * entre sus personajes (el motor, que no modela aliados, lo aplica a la
 * identidad). `heroFormOnly`: solo a los jugadores en forma de Héroe.
 */
export interface RevealDamage {
  amount: number;
  indirect: boolean;
  heroFormOnly: boolean;
}

/**
 * Habilidades de una cara del villano que el motor resuelve solo. Todas
 * opcionales: un villano normal no lleva ninguna.
 */
export interface VillainFaceAbilities {
  /**
   * Interrupción obligada "cuando vaya a atacar, en vez de eso coloca N
   * contadores en el Entorno" (Norman Osborn: 1/2/3 de Infamia).
   */
  attackPlacesEnvironmentCounters?: number;
  /**
   * Interrupción obligada "cuando vaya a ejecutar el Plan, en vez de eso quita
   * N contadores del Entorno" (Duende Verde: 1/1/2 de Locura).
   */
  schemeRemovesEnvironmentCounters?: number;
  /**
   * Interrupción obligada "cuando vaya a sufrir daño, en vez de eso quita esa
   * misma cantidad de contadores del Entorno" (Norman Osborn).
   */
  damageRemovesEnvironmentCounters?: boolean;
  /** "Cuando se muestre esta carta": daño a los jugadores. */
  onRevealDamage?: RevealDamage;
  /** "Cuando se muestre esta carta": reparte N cartas de encuentro a cada jugador. */
  dealEncounterCardsOnReveal?: number;
  /**
   * Respuesta obligada "después de que el villano ataque y te inflija daño,
   * coloca N de amenaza sobre el plan principal" (Duende Verde de La fórmula
   * mutagénica: 1/1/2).
   */
  threatAfterDamagingAttack?: number;
}

/**
 * Cara B de un estadio de villano de dos caras (Negocios arriesgados: el
 * Duende Verde en el reverso de Norman Osborn). Comparte estadio y PG con la
 * cara A; cambia nombre, carta, ATQ/PLA y habilidades.
 */
export interface VillainFlipSideDefinition extends VillainFaceAbilities {
  cardId: string;
  name: string;
  attack: number;
  scheme: number;
}

/**
 * Definición de un estadio del villano (I, II, III). Los PG se expresan POR
 * JUGADOR: el motor los multiplica por el nº de jugadores al construir el
 * estado (confirmado contra el RRG v1.7 / datos per-player de marvelcdb).
 *
 * Los campos de VillainFaceAbilities describen la cara A (la única, en un
 * villano normal); `flipSide` describe la cara B si el villano tiene dos.
 */
export interface VillainStageDefinition extends VillainFaceAbilities {
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
  /** Cara B del villano (villanos de dos caras). */
  flipSide?: VillainFlipSideDefinition;
}

/**
 * Efecto "Cuando se complete esta etapa" del plan principal que el motor
 * resuelve solo. Los demás se resuelven por el texto de la carta (guiados).
 *
 * PLACE_ENVIRONMENT_COUNTERS_THEN_MILL (OPA hostil): coloca N ×jugadores
 * contadores en el Entorno si está por su cara A (Empresa criminal); luego
 * descarta de la biblioteca de cada jugador 1 carta por contador del Entorno.
 */
export type MainSchemeCompletionEffect = {
  type: "PLACE_ENVIRONMENT_COUNTERS_THEN_MILL";
  countersPerPlayer: number;
};

/**
 * Plan principal del escenario. threatToCompletePerPlayer se multiplica por el
 * nº de jugadores; la amenaza inicial solo si startingThreatPerPlayer (icono
 * [per_hero] impreso). La aceleración impresa se multiplica aparte, en
 * addThreatStep.
 */
export interface ScenarioMainScheme {
  id: string;
  cardId: string;
  name: string;
  startingThreat: number;
  /** La amenaza inicial es POR JUGADOR (marvelcdb: base_threat_fixed = false). */
  startingThreatPerPlayer?: boolean;
  escalationThreat: number;
  /**
   * Aceleración variable "X = nº de enemigos con este rasgo en juego (incluido
   * el villano)" (Nube de mutágeno: rasgo "Goblin"). Sustituye a la
   * aceleración impresa y NO escala por jugadores (marvelcdb:
   * escalation_threat_fixed = true).
   */
  escalationPerEnemyWithTrait?: string;
  threatToCompletePerPlayer: number;
  /** Efecto "Cuando se complete esta etapa" resuelto por el motor. */
  whenCompleted?: MainSchemeCompletionEffect;
}

/** Una cara de una carta de Entorno de dos caras con contadores. */
export interface EnvironmentFaceDefinition {
  cardId: string;
  name: string;
  /** Tipo de contador de esta cara ("Infamia", "Locura"). */
  counterName: string;
  /** Entra en juego (o se da la vuelta a esta cara) con N ×jugadores contadores. */
  countersPerPlayer: number;
}

/**
 * Entorno de dos caras ligado al villano de dos caras (Negocios arriesgados):
 * entra en la preparación por la cara A junto a la cara A del villano y,
 * "si no hay contadores sobre esta carta", se dan la vuelta los dos.
 */
export interface ScenarioEnvironmentDefinition {
  faceA: EnvironmentFaceDefinition;
  faceB: EnvironmentFaceDefinition;
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
  /**
   * Nombre del escenario cuando no basta con el del villano (p.ej. dos
   * escenarios del Duende Verde: "Negocios arriesgados" / "La fórmula
   * mutagénica"). La app lo muestra bajo el nombre del villano.
   */
  scenarioName?: string;
  /** Entorno de dos caras con contadores (Negocios arriesgados). */
  environment?: ScenarioEnvironmentDefinition;
  /**
   * Preparación: por cada jugador, se saca del mazo de encuentros 1 copia de
   * cada carta listada y se pone en juego enfrentada a él (La fórmula
   * mutagénica: un Esclavo duende por jugador).
   */
  setupMinionsPerPlayer?: string[];
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

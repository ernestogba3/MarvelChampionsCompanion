import type {
  ScenarioDefinition,
  ScenarioVillainDefinition,
  VillainStageDefinition,
} from "./types";

// Mazos de encuentros de The Wrecking Crew: uno por villano, 15 cartas cada
// uno (inserto de reglas del pack), con las cantidades de marvelcdb. Sin set
// estándar ni modular: el inserto dice que el escenario no usa otros
// conjuntos de encuentros, ni cartas de némesis ni obligaciones.

// Destructor: 07005 Toma de rehenes ×1, 07006 Palanca mágica ×1, 07007
// Liderados por Destructor ×1, 07008 Celador corrupto ×1 (Guardia), 07009
// Preso fugado ×1 (Oleada), 07010 Compañerismo ×1, 07011 Caos en la cárcel
// ×1, 07012 Lanzamiento de palanca ×2, 07013 ¡Destrozadlos! ×1, 07014 ¡Lo
// estaba deseando! ×1, 07015 Vínculo místico ×2, 07016 ¡Date por muerto! ×2.
const WRECKER_DECK: string[] = [
  "07005", "07006", "07007", "07008", "07009", "07010", "07011", "07012",
  "07012", "07013", "07014", "07015", "07015", "07016", "07016",
];

// Bola de Trueno: 07020 Bola y cadena ×1, 07021 Toma de rehenes ×1, 07022
// Acumulación de radiación ×1, 07023 Celador corrupto ×1, 07024 Preso fugado
// ×1, 07025 Compañerismo ×1, 07026 Caos en la cárcel ×1, 07027 Proyectiles de
// energía ×2, 07028 ¡Destrozadlos! ×1, 07029 ¡Lo estaba deseando! ×1, 07030
// Descarga energética ×2, 07031 Destreza táctica ×2.
const THUNDERBALL_DECK: string[] = [
  "07020", "07021", "07022", "07023", "07024", "07025", "07026", "07027",
  "07027", "07028", "07029", "07030", "07030", "07031", "07031",
];

// Martinete: 07035 Bravatas ×2, 07036 Toma de rehenes ×1, 07037 Celador
// corrupto ×1, 07038 Preso fugado ×1, 07039 Compañerismo ×1, 07040
// ¡Destrozadlos! ×1, 07041 ¡Lo estaba deseando! ×1, 07042 Puños enormes ×2,
// 07043 Plan de huida ×2, 07044 Aporrear ×2, 07045 Resistencia
// extraordinaria ×1.
const PILEDRIVER_DECK: string[] = [
  "07035", "07035", "07036", "07037", "07038", "07039", "07040", "07041",
  "07042", "07042", "07043", "07043", "07044", "07044", "07045",
];

// Bulldozer: 07049 Casco de Bulldozer ×1, 07050 Toma de rehenes ×1, 07051
// Velocidad de embestida ×2, 07052 Celador corrupto ×1, 07053 Preso fugado
// ×1, 07054 Compañerismo ×1, 07055 Acometida ×2, 07056 Caos en la cárcel ×1,
// 07057 ¡Destrozadlos! ×1, 07058 Cabezazo ×2, 07059 Liderar la carga ×2.
const BULLDOZER_DECK: string[] = [
  "07049", "07050", "07051", "07051", "07052", "07053", "07054", "07055",
  "07055", "07056", "07057", "07058", "07058", "07059", "07059",
];

// Campos comunes de los estadios A/B de los cuatro villanos.
const COMMON_STAGE: Pick<
  VillainStageDefinition,
  | "tough"
  | "stunAllOnReveal"
  | "clearAttachmentsOnEnter"
  | "sideSchemesOnEnter"
  | "schemesOnOwnSideScheme"
> = {
  tough: false,
  stunAllOnReveal: false,
  clearAttachmentsOnEnter: false,
  sideSchemesOnEnter: [],
  schemesOnOwnSideScheme: true,
};

const WRECKER: ScenarioVillainDefinition = {
  id: "wrecker",
  name: "Wrecker",
  stages: [
    {
      ...COMMON_STAGE,
      stage: "A",
      cardId: "07002",
      attack: 2,
      scheme: 2,
      healthPerPlayer: 14,
      attackBonusIfUndefended: 2,
    },
    {
      ...COMMON_STAGE,
      stage: "B",
      cardId: "07003",
      attack: 3,
      scheme: 3,
      healthPerPlayer: 18,
      attackBonusIfUndefended: 2,
    },
  ],
  encounterDeck: WRECKER_DECK,
  signatureScheme: {
    id: "side-day-of-reckoning",
    cardId: "07004",
    name: "Ajuste de cuentas",
    startingThreat: 6,
    overflowAt: 10,
    resetTo: 3,
    // "Inflige 2 de daño a cada personaje amigo" (a la identidad: el motor no
    // modela aliados).
    overflowEffect: { type: "DAMAGE_EACH_PLAYER", amount: 2 },
  },
};

const THUNDERBALL: ScenarioVillainDefinition = {
  id: "thunderball",
  name: "Thunderball",
  stages: [
    {
      ...COMMON_STAGE,
      stage: "A",
      cardId: "07017",
      attack: 1,
      scheme: 3,
      healthPerPlayer: 13,
      damageAfterAttack: 1,
    },
    {
      ...COMMON_STAGE,
      stage: "B",
      cardId: "07018",
      attack: 2,
      scheme: 3,
      healthPerPlayer: 16,
      damageAfterAttack: 1,
    },
  ],
  encounterDeck: THUNDERBALL_DECK,
  signatureScheme: {
    id: "side-thunderstruck",
    cardId: "07019",
    name: "Poderoso como el trueno",
    startingThreat: 5,
    overflowAt: 10,
    resetTo: 3,
    overflowEffect: { type: "STUN_EACH_PLAYER" },
  },
};

const PILEDRIVER: ScenarioVillainDefinition = {
  id: "piledriver",
  name: "Piledriver",
  stages: [
    {
      ...COMMON_STAGE,
      stage: "A",
      cardId: "07032",
      attack: 2,
      scheme: 2,
      healthPerPlayer: 11,
      retaliate: 1,
    },
    {
      ...COMMON_STAGE,
      stage: "B",
      cardId: "07033",
      attack: 3,
      scheme: 2,
      healthPerPlayer: 14,
      retaliate: 1,
    },
  ],
  encounterDeck: PILEDRIVER_DECK,
  signatureScheme: {
    // La carta impresa dice "mientras Destructor esté en juego" (errata); el
    // inserto de reglas y el resto de planes indican que es el de Martinete.
    id: "side-pile-it-on",
    cardId: "07034",
    name: "Ejercer presión",
    startingThreat: 3,
    overflowAt: 10,
    resetTo: 3,
    // "Cada jugador descarta la mejora o el apoyo de mayor coste que
    // controle": el motor no conoce costes → guiado.
    overflowEffect: { type: "GUIDED" },
  },
};

const BULLDOZER: ScenarioVillainDefinition = {
  id: "bulldozer",
  name: "Bulldozer",
  stages: [
    {
      ...COMMON_STAGE,
      stage: "A",
      cardId: "07046",
      attack: 3,
      scheme: 1,
      healthPerPlayer: 12,
    },
    {
      ...COMMON_STAGE,
      stage: "B",
      cardId: "07047",
      attack: 3,
      scheme: 2,
      healthPerPlayer: 15,
    },
  ],
  encounterDeck: BULLDOZER_DECK,
  signatureScheme: {
    id: "side-clear-the-road",
    cardId: "07048",
    name: "Despeja el camino",
    startingThreat: 4,
    overflowAt: 10,
    resetTo: 3,
    overflowEffect: { type: "MILL_EACH_PLAYER", count: 10 },
  },
};

/**
 * Escenario "Fuga de prisión" (pack The Wrecking Crew). Datos de marvelcdb
 * (es + en, 2026-10) y reglas del inserto oficial del pack (FFG,
 * mc03_wrecking_crew_rules_insert).
 *
 * CUATRO VILLANOS A LA VEZ (game/multiVillain.ts):
 *   - Destructor, Bola de Trueno, Martinete y Bulldozer, cada uno con un único
 *     estadio: versión A en Estándar, B en Experto. PG por jugador.
 *   - Solo activa el villano con el contador activo (empieza en Destructor).
 *     Sus cartas de aumento y las de encuentro que se reparten salen de su
 *     mazo; "el villano" en cualquier carta es el activo.
 *   - Cada villano tiene su mazo de 15 cartas y su descarte; al agotarse se
 *     baraja y suma un token de aceleración al plan principal.
 *   - Al maquinar, cada villano pone la amenaza en SU plan secundario. Esos
 *     planes no se descartan a 0; al llegar a 10 disparan su efecto y bajan a
 *     3; se retiran al derrotar a su villano.
 *   - Se puede atacar a cualquier villano (la Guardia bloquea atacar a todos).
 *     Si cae el activo, el contador pasa al villano con más amenaza en su
 *     plan. Derrotar a los cuatro es la victoria.
 *   - Fuga de prisión (umbral 6 ×jugadores, +1 fijo): tras el paso 1 pone 1 de
 *     amenaza en cada plan secundario y mueve el contador activo al villano
 *     con más amenaza en su plan. En los empates "elige el jugador inicial":
 *     el motor deja el contador donde estaba si es uno de los empatados (si
 *     no, el primero en orden) y la app permite cambiarlo a mano.
 *
 * Lo que el motor resuelve de las cartas: Represalia de Martinete, +2 ATQ de
 * Destructor (sus ataques son siempre no defendidos para el motor), 1 de
 * daño extra de Bola de Trueno, Celador corrupto (Guardia), Preso fugado
 * (Oleada) y los "Cuando se muestre" de Lanzamiento de palanca,
 * ¡Destrozadlos!, ¡Lo estaba deseando!, Vínculo místico, Proyectiles de
 * energía, Descarga energética, Destreza táctica, Aporrear y Acometida (ver
 * game/wreckingCrewCards.ts).
 *
 * MODO "ÁRBITRO" — guiado por el texto de la carta: acoples (Toma de
 * rehenes, Palanca mágica, Bravatas…), Compañerismo, Caos en la cárcel,
 * ¡Date por muerto!, Puños enormes, Plan de huida, Resistencia
 * extraordinaria, Cabezazo, Liderar la carga, los aumentos con estrella y el
 * efecto al llegar a 10 de Ejercer presión. Para ellos la app permite mover
 * el contador activo y sumar amenaza a un plan a mano.
 *
 * No modelado: el modo "desafío extremo" del inserto (versiones A y luego B)
 * ni las mezclas A/B a medida.
 */
export const WRECKING_CREW_SCENARIO: ScenarioDefinition = {
  id: "wrecking-crew",
  villainName: "The Wrecking Crew",
  scenarioName: "Fuga de prisión",
  villains: [WRECKER, THUNDERBALL, PILEDRIVER, BULLDOZER],
  mainScheme: {
    id: "main-breakout",
    cardId: "07001b",
    name: "Fuga de prisión",
    startingThreat: 0,
    escalationThreat: 1,
    escalationFixed: true,
    threatToCompletePerPlayer: 6,
    afterThreatStep: {
      type: "THREAT_ON_EACH_SIDE_SCHEME_THEN_MOVE_ACTIVE",
      amount: 1,
    },
  },
  // Escenario multivillano: cada villano trae sus estadios y su mazo.
  stages: [],
  progression: {
    STANDARD: { start: "A", final: "A" },
    EXPERT: { start: "B", final: "B" },
  },
  encounterDeck: [],
  boostCardsPerActivation: 1,
};

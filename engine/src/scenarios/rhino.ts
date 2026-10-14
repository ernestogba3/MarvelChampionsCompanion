import type { ScenarioDefinition } from "./types";

// Mazo de encuentros estándar de Rino (set RHINO + set STANDARD), extraído
// literalmente del createGame.ts original. El orden NO se baraja a propósito:
// el orden real se decide fuera del motor para que los tests sean
// deterministas.
const RHINO_STANDARD_ENCOUNTER_DECK: string[] = [
  "01098",
  "01099",
  "01099",
  "01100",
  "01101",
  "01101",
  "01102",
  "01103",
  "01104",
  "01104",
  "01105",
  "01105",
  "01106",
  "01106",
  "01106",
  "01107",
  "01108",
  "01186",
  "01186",
  "01187",
  "01187",
  "01188",
  "01189",
  "01190",
];

/**
 * Escenario de Rino para 1-4 jugadores. Todos los valores proceden del
 * createGame.ts / villainStages.ts originales, ya verificados contra el RRG
 * v1.7 y los datos per-player de marvelcdb. Convertirlo a datos no cambia
 * ninguna cifra; solo mueve lo que estaba cableado a esta definición.
 *
 * - Estándar: empieza en estadio I; derrotar al II es la victoria.
 * - Experto: empieza en estadio II (con "Arramblar con todo" ya en juego);
 *   derrotar al III es la victoria.
 */
export const RHINO_SCENARIO: ScenarioDefinition = {
  id: "rhino",
  villainName: "Rhino",
  mainScheme: {
    id: "main-break-in",
    cardId: "01097",
    name: "¡Allanamiento!",
    startingThreat: 0,
    escalationThreat: 1,
    threatToCompletePerPlayer: 7,
  },
  stages: [
    {
      stage: "I",
      cardId: "01094",
      attack: 2,
      scheme: 1,
      healthPerPlayer: 14,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
    {
      stage: "II",
      cardId: "01095",
      attack: 3,
      scheme: 1,
      healthPerPlayer: 15,
      tough: false,
      stunAllOnReveal: false,
      // El motor original NO limpiaba las acopladas al pasar a II.
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [
        {
          id: "side-breakin-takin",
          cardId: "01107",
          name: "Arramblar con todo",
          threat: 2,
          threatToComplete: 0,
          escalationThreat: 0,
          accelerationTokens: 0,
        },
      ],
    },
    {
      stage: "III",
      cardId: "01096",
      attack: 4,
      scheme: 1,
      healthPerPlayer: 16,
      tough: true,
      stunAllOnReveal: true,
      // Rino III sí entra limpiando las acopladas (comportamiento original).
      clearAttachmentsOnEnter: true,
      sideSchemesOnEnter: [],
    },
  ],
  progression: {
    STANDARD: { start: "I", final: "II" },
    EXPERT: { start: "II", final: "III" },
  },
  encounterDeck: RHINO_STANDARD_ENCOUNTER_DECK,
  // Rino roba 1 carta de aumento por activación y su plan principal es de una
  // sola etapa (completarlo = derrota). Comportamiento original intacto.
  boostCardsPerActivation: 1,
  mainSchemeCompletionLoses: true,
};

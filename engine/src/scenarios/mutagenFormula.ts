import type { ScenarioDefinition } from "./types";

// Mazo de encuentros estándar de La fórmula mutagénica: cartas del set
// MUTAGEN_FORMULA (según su cantidad en marvelcdb) + set STANDARD. Sin set
// modular (la carta 1A recomienda "Trucos de duende"), igual que los
// escenarios del Core en este proyecto. En la preparación se sacan de aquí los
// Esclavos duende que empiezan en juego (1 por jugador, ver
// setupMinionsPerPlayer).
//
// Cantidades del set MUTAGEN_FORMULA en el mazo:
//   02019 Planeador duende       ×1  (acople)
//   02020 Histeria               ×1  (acople)
//   02021 Bombas calabaza        ×1  (acople)
//   02022 Caballero Duende       ×1  (esbirro Élite Duende)
//   02023 Soldado duende         ×4  (esbirro Duende)
//   02024 Esclavo duende         ×6  (esbirro Duende: Guardia)
//   02025 Monstruo               ×1  (esbirro Élite Duende)
//   02026 Duendes de refuerzo    ×2  (plan secundario: Peligro)
//   02027 Nación duende          ×1  (plan secundario)
//   02028 Horda imparable        ×2  (plan secundario: 2 Aceleración)
//   02029 Muerte desde el cielo  ×2  (treachery)
//   02030 Te veo                 ×1  (treachery)
//   02031 Exceso de confianza    ×1  (treachery)
//   02032 Ambición cruel         ×2  (treachery)
// Set STANDARD: 01186 ×2, 01187 ×2, 01188 ×1, 01189 ×1, 01190 ×1.
const MUTAGEN_FORMULA_STANDARD_ENCOUNTER_DECK: string[] = [
  "02019",
  "02020",
  "02021",
  "02022",
  "02023",
  "02023",
  "02023",
  "02023",
  "02024",
  "02024",
  "02024",
  "02024",
  "02024",
  "02024",
  "02025",
  "02026",
  "02026",
  "02027",
  "02028",
  "02028",
  "02029",
  "02029",
  "02030",
  "02031",
  "02032",
  "02032",
  "01186",
  "01186",
  "01187",
  "01187",
  "01188",
  "01189",
  "01190",
];

/**
 * Escenario "La fórmula mutagénica" (pack The Green Goblin). Datos
 * verificados contra marvelcdb (es + en, 2026-10).
 *
 * Lo que el motor resuelve solo:
 *   - Preparación: un Esclavo duende (Guardia) enfrentado a cada jugador,
 *     sacado del mazo de encuentros.
 *   - Plan principal de 2 etapas: Liberar el mutágeno (umbral 7 ×jugadores,
 *     empieza con 2 ×jugadores) → Nube de mutágeno (umbral 11 ×jugadores,
 *     empieza con 4 ×jugadores); completar esta última es la derrota. La
 *     aceleración de Nube de mutágeno es X = nº de enemigos [[Duende]] en
 *     juego incluido el Duende Verde, sin escalar por jugadores
 *     (escalationPerEnemyWithTrait).
 *   - Respuesta obligada del villano: tras atacar e infligir daño, coloca 1/1/2
 *     de amenaza en el plan principal.
 *   - "Cuando se muestre" de los estadios II/III: reparte 2/3 cartas de
 *     encuentro a cada jugador (también al empezar en Experto).
 *   - Duendes de refuerzo: +1 de amenaza por cada esbirro [[Duende]] en juego.
 *   - Iconos de Peligro / Aceleración de los planes secundarios.
 *
 * Progresión de estadios CONFIRMADA por la carta 1A: Estándar I → II,
 * Experto II → III.
 *
 * MODO "ÁRBITRO" — se resuelve por el texto de la carta (guiado):
 *   - "Cuando se complete" de Liberar el mutágeno, Ambición cruel, Horda
 *     imparable, Caballero Duende y los aumentos con estrella de Soldado /
 *     Esclavo duende ("pon en juego enfrentado a ti"): el jugador los resuelve
 *     con su mazo físico y mete el esbirro con "Poner esbirro en juego".
 *   - Nación duende (+1 ATQ a los enemigos Duende), Histeria, Bombas
 *     calabaza, Planeador duende, Te veo, Muerte desde el cielo, Exceso de
 *     confianza: por el texto de la carta.
 */
export const MUTAGEN_FORMULA_SCENARIO: ScenarioDefinition = {
  id: "mutagen-formula",
  villainName: "Green Goblin",
  scenarioName: "La fórmula mutagénica",
  setupMinionsPerPlayer: ["02024"],
  mainScheme: {
    id: "main-unleashing-the-mutagen",
    cardId: "02017b",
    name: "Liberar el mutágeno",
    startingThreat: 2,
    startingThreatPerPlayer: true,
    escalationThreat: 1,
    threatToCompletePerPlayer: 7,
  },
  additionalMainSchemeStages: [
    {
      id: "main-mutagen-cloud",
      cardId: "02018b",
      name: "Nube de mutágeno",
      startingThreat: 4,
      startingThreatPerPlayer: true,
      escalationThreat: 0,
      escalationPerEnemyWithTrait: "Goblin",
      threatToCompletePerPlayer: 11,
    },
  ],
  stages: [
    {
      stage: "I",
      cardId: "02014",
      attack: 2,
      scheme: 1,
      healthPerPlayer: 16,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
      threatAfterDamagingAttack: 1,
    },
    {
      stage: "II",
      cardId: "02015",
      attack: 2,
      scheme: 2,
      healthPerPlayer: 18,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
      dealEncounterCardsOnReveal: 2,
      threatAfterDamagingAttack: 1,
    },
    {
      stage: "III",
      cardId: "02016",
      attack: 3,
      scheme: 2,
      healthPerPlayer: 20,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
      dealEncounterCardsOnReveal: 3,
      threatAfterDamagingAttack: 2,
    },
  ],
  progression: {
    STANDARD: { start: "I", final: "II" },
    EXPERT: { start: "II", final: "III" },
  },
  encounterDeck: MUTAGEN_FORMULA_STANDARD_ENCOUNTER_DECK,
  boostCardsPerActivation: 1,
};

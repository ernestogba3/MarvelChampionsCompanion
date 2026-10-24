import type { ScenarioDefinition } from "./types";

// Mazo de encuentros estándar de Ultron: cartas del set ULTRON (según su
// cantidad en marvelcdb) + set STANDARD. La carta de Entorno "Drones de
// Ultrón" (01140) NO va en el mazo: define las reglas de los drones y está
// siempre en juego (ver game/drones.ts). "La Directriz Ultrón" (01150) sí va
// en el mazo; el estadio III la busca ahí.
//
// Cantidades del set ULTRON en el mazo:
//   01141 Transmisor de programa   ×1
//   01142 Drones mejorados         ×2
//   01143 Dron avanzado de Ultrón  ×3  (esbirro: Guardia; al morir, crea dron)
//   01144 Android Efficiency       ×3
//   01145 La cólera de Ultrón      ×2
//   01146 Secuencia de reparación  ×2
//   01147 Ejército robótico        ×2
//   01148 Fábrica de drones        ×1
//   01149 IA invasiva              ×1
//   01150 La Directriz Ultrón      ×1
// Set STANDARD: 01186 ×2, 01187 ×2, 01188 ×1, 01189 ×1, 01190 ×1.
const ULTRON_STANDARD_ENCOUNTER_DECK: string[] = [
  "01141",
  "01142",
  "01142",
  "01143",
  "01143",
  "01143",
  "01144",
  "01144",
  "01144",
  "01145",
  "01145",
  "01146",
  "01146",
  "01147",
  "01147",
  "01148",
  "01149",
  "01150",
  "01186",
  "01186",
  "01187",
  "01187",
  "01188",
  "01189",
  "01190",
];

/**
 * Escenario de Ultron (Core Set). Datos verificados contra marvelcdb (2026-10).
 *
 * Plan principal de TRES etapas (reutiliza el sistema multi-etapa del motor):
 *   1) La Capucha Carmesí   (umbral 3 ×jugadores)
 *   2) Ataque al NORAD      (umbral 10 ×jugadores)
 *   3) Cuenta atrás para el olvido (umbral 5 ×jugadores) → completarla = derrota
 *
 * Drones: el estadio III da +1 ATQ/+1 PG a los Drones (droneBonus) y hace a
 * Ultron INMUNE al daño mientras haya un Dron en juego. El bonus del acople
 * "Drones mejorados" (+1/+1 extra) NO se modela: se aplica a mano (guiado).
 *
 * ASUNCIÓN A CONFIRMAR (igual que Rino/Klaw): progresión de estadios del
 * villano Estándar I→II / Experto II→III. Nota: la progresión del VILLANO es
 * independiente de las 3 etapas del plan principal (estas avanzan por amenaza
 * en cualquier dificultad).
 */
export const ULTRON_SCENARIO: ScenarioDefinition = {
  id: "ultron",
  villainName: "Ultron",
  mainScheme: {
    id: "main-crimson-cowl",
    cardId: "01137",
    name: "La Capucha Carmesí",
    startingThreat: 0,
    escalationThreat: 1,
    threatToCompletePerPlayer: 3,
  },
  additionalMainSchemeStages: [
    {
      id: "main-assault-norad",
      cardId: "01138",
      name: "Ataque al NORAD",
      startingThreat: 0,
      escalationThreat: 1,
      threatToCompletePerPlayer: 10,
    },
    {
      id: "main-countdown-oblivion",
      cardId: "01139",
      name: "Cuenta atrás para el olvido",
      startingThreat: 0,
      escalationThreat: 1,
      threatToCompletePerPlayer: 5,
    },
  ],
  stages: [
    {
      stage: "I",
      cardId: "01134",
      attack: 2,
      scheme: 1,
      healthPerPlayer: 17,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
    {
      stage: "II",
      cardId: "01135",
      attack: 2,
      scheme: 2,
      healthPerPlayer: 22,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
    {
      stage: "III",
      cardId: "01136",
      attack: 4,
      scheme: 2,
      healthPerPlayer: 27,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
      // Ultron III: inmune mientras haya un Dron, y los Drones ganan +1/+1.
      immuneWhileDronesPresent: true,
      droneBonus: 1,
    },
  ],
  progression: {
    STANDARD: { start: "I", final: "II" },
    EXPERT: { start: "II", final: "III" },
  },
  encounterDeck: ULTRON_STANDARD_ENCOUNTER_DECK,
  boostCardsPerActivation: 1,
};

import type { ScenarioDefinition } from "./types";

// Mazo de encuentros estándar de Negocios arriesgados: cartas del set
// RISKY_BUSINESS (según su cantidad en marvelcdb) + set STANDARD. Sin set
// modular (la carta 1A recomienda "Trucos de duende"), igual que los
// escenarios del Core en este proyecto. El Entorno (02006a/b) NO va en el
// mazo: está en juego desde la preparación (ver `environment`).
//
// Cantidades del set RISKY_BUSINESS en el mazo:
//   02007 Pistolero a sueldo            ×3  (esbirro)
//   02008 Guardia privado de seguridad  ×4  (esbirro: Guardia)
//   02009 Puente inestable              ×1  (plan secundario: Crisis)
//   02010 Industrias Oscorp             ×2  (plan secundario: Aceleración)
//   02011 Soborno                       ×2  (plan secundario: Peligro)
//   02012 Rutina laboral                ×4  (treachery)
//   02013 Genio loco                    ×2  (treachery)
// Set STANDARD: 01186 ×2, 01187 ×2, 01188 ×1, 01189 ×1, 01190 ×1.
const RISKY_BUSINESS_STANDARD_ENCOUNTER_DECK: string[] = [
  "02007",
  "02007",
  "02007",
  "02008",
  "02008",
  "02008",
  "02008",
  "02009",
  "02010",
  "02010",
  "02011",
  "02011",
  "02012",
  "02012",
  "02012",
  "02012",
  "02013",
  "02013",
  "01186",
  "01186",
  "01187",
  "01187",
  "01188",
  "01189",
  "01190",
];

/**
 * Escenario "Negocios arriesgados" (pack The Green Goblin). Datos verificados
 * contra marvelcdb (es + en, 2026-10) y contra la imagen impresa de 02002b
 * (la API en inglés dice 3 de daño indirecto en el Duende Verde II; la carta
 * dice 4).
 *
 * VILLANO DE DOS CARAS + ENTORNO CON CONTADORES (game/villainFaces.ts):
 *   - Norman Osborn (cara A): no ataca; su Interrupción obligada coloca 1/2/3
 *     de Infamia en Empresa criminal. El daño que iba a sufrir quita esa misma
 *     cantidad de Infamia (el exceso se pierde: un daño separado posterior ya
 *     golpea al Duende — resolución de Caleb sobre Magic Blast).
 *   - Duende Verde (cara B): no maquina; su Interrupción obligada quita 1/1/2
 *     de Locura de Estado de locura. "Cuando se muestre": I = 3 de daño
 *     indirecto a cada jugador en forma de Héroe, II = 4 indirecto a cada
 *     jugador, III = 4 de daño (directo) a cada jugador.
 *   - Empresa criminal entra con 2 ×jugadores de Infamia; al quedarse a 0 se
 *     dan la vuelta Norman y el Entorno (Estado de locura, 2 ×jugadores de
 *     Locura). Al quedarse a 0 la Locura, vuelven a Norman / Empresa criminal.
 *     El daño del villano se conserva al darse la vuelta (es la misma carta).
 *   - Al voltear se resuelve el "Cuando se muestre" de la cara nueva.
 *
 * DERROTA DE UN ESTADIO — ASUNCIÓN CONTRASTADA, SIN RULING OFICIAL: el nuevo
 * estadio entra por la cara Duende Verde (la cara en la que se le derrotó;
 * Norman no puede sufrir daño), resuelve su "Cuando se muestre" y Estado de
 * locura conserva sus contadores. Ni el RRG v1.5 ni las FAQ lo precisan; es
 * la forma en que se juega en partidas publicadas (YouTube, p.ej.
 * cQ-SpBZYm4k 44:13, 1pL_yicKdHg 29:26, bfl5au_GU7U 13:15, NlOSLl8ViN4 56:12,
 * VFTuYkLnPk8 24:21). Está en un único punto: faceForNextStage en
 * game/villainFaces.ts.
 *
 * Plan principal de 2 etapas: OPA hostil (umbral 7 ×jugadores, empieza con 2
 * ×jugadores) → Adquisición corporativa (umbral 10 ×jugadores, empieza con 1
 * ×jugadores, aceleración 2); completar esta última es la derrota. El
 * "Cuando se complete" de OPA hostil lo resuelve el motor (Infamia + descarte
 * de la biblioteca simulada de cada jugador).
 *
 * Progresión de estadios CONFIRMADA por la carta 1A: Estándar Norman I → II,
 * Experto II → III.
 *
 * MODO "ÁRBITRO" — se resuelve por el texto de la carta (guiado):
 *   - Pistolero a sueldo (elegir aumento o Infamia), Genio loco, efectos de
 *     aumento con estrella "coloca 1 de Infamia / si no puedes, quita 1 de
 *     Locura": el jugador ajusta los contadores con los botones +1/−1 del
 *     Entorno (el volteo al llegar a 0 sí es automático).
 *   - Icono de Peligro de Adquisición corporativa y Soborno: sí automático
 *     (cartas extra en el paso 3). Crisis de Puente inestable y Aceleración de
 *     Industrias Oscorp: también automáticos (ver data/cards.ts).
 *   - Reparto del daño indirecto entre aliados: el motor lo aplica a la
 *     identidad (no modela aliados).
 */
export const RISKY_BUSINESS_SCENARIO: ScenarioDefinition = {
  id: "risky-business",
  villainName: "Norman Osborn",
  scenarioName: "Negocios arriesgados",
  environment: {
    faceA: {
      cardId: "02006a",
      name: "Empresa criminal",
      counterName: "Infamia",
      countersPerPlayer: 2,
    },
    faceB: {
      cardId: "02006b",
      name: "Estado de locura",
      counterName: "Locura",
      countersPerPlayer: 2,
    },
  },
  mainScheme: {
    id: "main-hostile-takeover",
    cardId: "02004b",
    name: "OPA hostil",
    startingThreat: 2,
    startingThreatPerPlayer: true,
    escalationThreat: 1,
    threatToCompletePerPlayer: 7,
    whenCompleted: {
      type: "PLACE_ENVIRONMENT_COUNTERS_THEN_MILL",
      countersPerPlayer: 1,
    },
  },
  additionalMainSchemeStages: [
    {
      id: "main-corporate-acquisition",
      cardId: "02005b",
      name: "Adquisición corporativa",
      startingThreat: 1,
      startingThreatPerPlayer: true,
      escalationThreat: 2,
      threatToCompletePerPlayer: 10,
    },
  ],
  stages: [
    {
      stage: "I",
      cardId: "02001a",
      // Norman no tiene ATQ impreso; el FAQ oficial lo trata como 0.
      attack: 0,
      scheme: 2,
      healthPerPlayer: 14,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
      attackPlacesEnvironmentCounters: 1,
      damageRemovesEnvironmentCounters: true,
      flipSide: {
        cardId: "02001b",
        name: "Green Goblin",
        attack: 3,
        scheme: 0,
        schemeRemovesEnvironmentCounters: 1,
        onRevealDamage: { amount: 3, indirect: true, heroFormOnly: true },
      },
    },
    {
      stage: "II",
      cardId: "02002a",
      attack: 0,
      scheme: 2,
      healthPerPlayer: 18,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
      attackPlacesEnvironmentCounters: 2,
      damageRemovesEnvironmentCounters: true,
      flipSide: {
        cardId: "02002b",
        name: "Green Goblin",
        attack: 4,
        scheme: 0,
        schemeRemovesEnvironmentCounters: 1,
        onRevealDamage: { amount: 4, indirect: true, heroFormOnly: false },
      },
    },
    {
      stage: "III",
      cardId: "02003a",
      attack: 0,
      scheme: 3,
      healthPerPlayer: 22,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
      attackPlacesEnvironmentCounters: 3,
      damageRemovesEnvironmentCounters: true,
      flipSide: {
        cardId: "02003b",
        name: "Green Goblin",
        attack: 4,
        scheme: 0,
        schemeRemovesEnvironmentCounters: 2,
        // A diferencia de I y II, el III inflige daño directo a la identidad
        // (resolución de Boggs: no se puede asignar a aliados).
        onRevealDamage: { amount: 4, indirect: false, heroFormOnly: false },
      },
    },
  ],
  progression: {
    STANDARD: { start: "I", final: "II" },
    EXPERT: { start: "II", final: "III" },
  },
  encounterDeck: RISKY_BUSINESS_STANDARD_ENCOUNTER_DECK,
  boostCardsPerActivation: 1,
};

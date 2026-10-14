import type { ScenarioDefinition } from "./types";

// Mazo de encuentros estándar de Klaw: todas las cartas de encuentro del set
// KLAW (según su cantidad en marvelcdb) + el set STANDARD (mismas cantidades
// que usa Rino). No se baraja aquí: el orden lo decide la app al iniciar.
//
// Composición del set KLAW (cantidad):
//   01118 Transformador sónico       ×1   (acople)
//   01119 Cuerpo de sonido sólido    ×1   (acople)
//   01120 Guardia acorazado          ×3   (esbirro: Guardia + Dureza)
//   01121 Traficante de armas        ×2   (esbirro: Oleada)
//   01122 La venganza de Klaw        ×2   (treachery)
//   01123 Estallido sónico           ×2   (treachery)
//   01124 Manipulación del sonido    ×2   (treachery)
//   01125 Red de defensa             ×1   (plan secundario)
//   01126 Fábrica de armamento       ×1   (plan secundario)
//   01127 Klaw "el inmortal"         ×1   (plan secundario; el estadio II lo
//                                          busca en el mazo/descarte)
// Set STANDARD: 01186 ×2, 01187 ×2, 01188 ×1, 01189 ×1, 01190 ×1.
const KLAW_STANDARD_ENCOUNTER_DECK: string[] = [
  "01118",
  "01119",
  "01120",
  "01120",
  "01120",
  "01121",
  "01121",
  "01122",
  "01122",
  "01123",
  "01123",
  "01124",
  "01124",
  "01125",
  "01126",
  "01127",
  "01186",
  "01186",
  "01187",
  "01187",
  "01188",
  "01189",
  "01190",
];

/**
 * Escenario de Klaw (Core Set). Datos verificados contra marvelcdb (2026-10):
 * estadios I/II/III con sus PG por jugador, ATQ y Plan; plan principal de dos
 * etapas; esbirros, treacheries, acoples y planes secundarios del set.
 *
 * MODO "ÁRBITRO" — divergencias conscientes y documentadas, porque el motor
 * todavía no modela varias mecánicas de Klaw:
 *   - Plan principal de 2 etapas: se modela SOLO la etapa 1 "Distribución
 *     clandestina" (umbral 6 ×jugadores). mainSchemeCompletionLoses=false
 *     evita la derrota prematura; la app guía el avance a "Reunión secreta"
 *     (01117, umbral 8 ×jugadores), cuya finalización —la derrota real— se
 *     gestiona manualmente.
 *   - Interrupción obligada de Klaw (roba +1 carta de aumento): SÍ se modela
 *     vía boostCardsPerActivation=2.
 *   - Dureza del estadio III: SÍ (tough).
 *   - Palabras clave no modeladas (Represalia, aturdir al golpear, Oleada como
 *     robo real, pago de recursos / agotar): las treacheries de Klaw NO tienen
 *     resolución automática; la app muestra su texto para resolución manual.
 *   - Habilidad del estadio II (buscar a "Klaw el inmortal"): la carta está en
 *     el mazo de encuentros; la búsqueda la hace el jugador (guiada).
 *
 * ASUNCIÓN A CONFIRMAR: la progresión de estadios sigue la misma convención
 * del Core Set que Rino en este proyecto (Estándar I→II, Experto II→III). Si
 * la carta de preparación física de Klaw indica otra cosa, es un cambio de una
 * línea en `progression`.
 */
export const KLAW_SCENARIO: ScenarioDefinition = {
  id: "klaw",
  villainName: "Klaw",
  mainScheme: {
    id: "main-underground-distribution",
    cardId: "01116",
    name: "Distribución clandestina",
    startingThreat: 0,
    escalationThreat: 1,
    threatToCompletePerPlayer: 6,
  },
  stages: [
    {
      stage: "I",
      cardId: "01113",
      attack: 0,
      scheme: 2,
      healthPerPlayer: 12,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
    {
      stage: "II",
      cardId: "01114",
      attack: 1,
      scheme: 2,
      healthPerPlayer: 18,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
    {
      stage: "III",
      cardId: "01115",
      attack: 2,
      scheme: 3,
      healthPerPlayer: 22,
      // Klaw III entra con Dureza (keyword impresa).
      tough: true,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
  ],
  progression: {
    STANDARD: { start: "I", final: "II" },
    EXPERT: { start: "II", final: "III" },
  },
  encounterDeck: KLAW_STANDARD_ENCOUNTER_DECK,
  // Interrupción obligada: Klaw roba 2 cartas de aumento por activación.
  boostCardsPerActivation: 2,
  // Plan principal de varias etapas: completar la etapa 1 NO es derrota.
  mainSchemeCompletionLoses: false,
};

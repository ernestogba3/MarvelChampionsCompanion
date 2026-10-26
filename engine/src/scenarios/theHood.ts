import type { ScenarioDefinition } from "./types";

// Mazo de encuentros base de The Hood: su set propio (the_hood, sin el villano
// ni el plan principal) + el set Standard II que trae el pack. Los sets
// modulares que el jugador elija se mezclan aparte (ver data/modularSets.ts y
// createGame); no van aquí. No se baraja aquí: el orden lo decide la app.
//
// Set propio (cantidad):
//   24007 Imponerse a la competencia   ×1  (acople)
//   24008 Capa del Encapuchado         ×1  (acople, Firme)
//   24009 Pistola de El Encapuchado    ×2  (acople)
//   24010 Madame Máscara               ×1  (esbirro, Guardia)
//   24011 Ambición desmedida           ×1  (plan secundario, 2[por jugador])
//   24012 Reclutar sobre la marcha     ×1  (treachery)
//   24013 Tomar la delantera           ×3  (treachery)
// Set Standard II (cantidad):
//   24049 Adversario formidable        ×1  (entorno)
//   24050 Tratos turbios               ×2  (treachery)
//   24051 Ataque en tropel             ×1  (treachery)
//   24052 Fuerza abrumadora            ×1  (treachery)
//   24053 Una sombra del pasado        ×1  (treachery)
//   24054 Aniquilación total           ×2  (treachery, Oleada)
const THE_HOOD_ENCOUNTER_DECK: string[] = [
  "24007",
  "24008",
  "24009",
  "24009",
  "24010",
  "24011",
  "24012",
  "24013",
  "24013",
  "24013",
  "24049",
  "24050",
  "24050",
  "24051",
  "24052",
  "24053",
  "24054",
  "24054",
];

/**
 * Escenario de The Hood (El Encapuchado). Datos verificados contra marvelcdb
 * (pack `hood`, 2026-10): tres estadios de villano, plan principal de tres
 * etapas (umbrales 5/8/10 ×jugadores, aceleración 1 ×jugadores), su set propio
 * y nueve sets modulares que acompañan al pack.
 *
 * El diseño del escenario es ELEGIR SETS MODULARES: "aparta 7 sets modulares;
 * baraja 1 en el mazo de encuentros; los estadios II y III barajan otro". El
 * motor ya tiene sets modulares (el jugador los elige al crear la partida y sus
 * cartas se mezclan en el mazo). Divergencia de árbitro consciente: todos los
 * sets elegidos entran al empezar, en vez de apartarse y entrar de uno en uno
 * según avanza el villano; el "barajar otro al revelar el estadio" se hace a
 * mano. Elige unos 7 para una partida fiel.
 *
 * MODO "ÁRBITRO" — lo modelado y lo guiado:
 *   - Plan principal de 3 etapas: modelado por completo (avanza por umbral;
 *     cada etapa entra con su amenaza inicial por jugador; completar la última
 *     es la derrota).
 *   - Estadios I/II/III, amenaza de planes, Guardia (Madame Máscara), Dureza
 *     (Guardia acorazado), Represalia (Martinete) y Oleada impresa: por datos.
 *   - "Juego sucio" (descartar/repartir cartas de encuentro), el reparto a cada
 *     jugador de los planes, los efectos de aliados y los entornos: GUIADOS.
 *   - Villainous (los esbirros de la Brigada roban carta de aumento al
 *     activarse): no modelado (el motor solo da aumento al villano); guiado.
 *   - Expert II (set experto del pack): no se añade en Experto (el motor no
 *     cambia el set estándar por el experto); guiado, como en el resto.
 *
 * ASUNCIÓN: progresión de estadios Estándar I→II / Experto II→III (confirmada
 * por la carta de preparación 24004a: "The Hood (I) y (II); (II) y (III) en
 * experto").
 */
export const THE_HOOD_SCENARIO: ScenarioDefinition = {
  id: "the-hood",
  villainName: "El Encapuchado",
  mainScheme: {
    id: "main-making-connections",
    cardId: "24004",
    name: "Búsqueda de contactos",
    startingThreat: 1,
    startingThreatPerPlayer: true,
    escalationThreat: 1,
    threatToCompletePerPlayer: 5,
  },
  additionalMainSchemeStages: [
    {
      id: "main-promised-prosperity",
      cardId: "24005",
      name: "Promesa de prosperidad",
      startingThreat: 2,
      startingThreatPerPlayer: true,
      escalationThreat: 1,
      threatToCompletePerPlayer: 8,
    },
    {
      id: "main-crime-state",
      cardId: "24006",
      name: "Estado criminal",
      startingThreat: 3,
      startingThreatPerPlayer: true,
      escalationThreat: 1,
      threatToCompletePerPlayer: 10,
    },
  ],
  stages: [
    {
      stage: "I",
      cardId: "24001",
      attack: 1,
      scheme: 1,
      healthPerPlayer: 14,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
    {
      stage: "II",
      cardId: "24002",
      attack: 1,
      scheme: 2,
      healthPerPlayer: 16,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
    {
      stage: "III",
      cardId: "24003",
      attack: 2,
      scheme: 3,
      healthPerPlayer: 18,
      tough: false,
      stunAllOnReveal: false,
      clearAttachmentsOnEnter: false,
      sideSchemesOnEnter: [],
    },
  ],
  progression: {
    STANDARD: { start: "I", final: "II" },
    EXPERT: { start: "II", final: "III" },
  },
  encounterDeck: THE_HOOD_ENCOUNTER_DECK,
  boostCardsPerActivation: 1,
};

import type {
  Difficulty,
  GameState,
  PlayerState,
  SchemeState,
  VillainState,
} from "../domain/types";
import { getScenario, villainDefinition } from "../scenarios";
import { mainSchemeStartingThreat } from "./mainScheme";
import { putEncounterMinionIntoPlay } from "./putCardIntoPlay";
import { noShuffle, type Shuffle } from "./playerLibrary";
import {
  initialEnvironment,
  revealVillainFace,
  stageFace,
} from "./villainFaces";

export interface PlayerSetup {
  id: string;
  heroName: string;
  alterEgoName: string;
  // La vida del héroe NUNCA escala por número de jugadores (es la impresa en
  // su propia carta de identidad) — a diferencia de los PG del villano y el
  // umbral del plan principal, que sí escalan ×nº de jugadores.
  health: number;
  // IDs de marvelcdb de cada cara de la identidad (p.ej. "01001a" / "01001b"
  // para Spider-Man / Peter Parker), para mostrar la ilustración correcta
  // según la forma actual del jugador. Opcionales: sin ellos, simplemente no
  // se muestra miniatura para ese jugador.
  heroCardId?: string;
  alterEgoCardId?: string;
  // ID del mazo guardado que este jugador trae a la partida (ver
  // mobile/storage/gameStorage.ts → tabla "decks"). Opcional: lo usa la app
  // para inicializar la biblioteca simulada del jugador.
  deckId?: string;
}

function buildPlayers(setups: PlayerSetup[]): PlayerState[] {
  return setups.map((setup) => ({
    id: setup.id,
    heroName: setup.heroName,
    alterEgoName: setup.alterEgoName,
    form: "ALTER_EGO",
    health: setup.health,
    maxHealth: setup.health,
    faceDownEncounterCards: [],
    stunned: false,
    upgradesInPlay: [],
    // Con exactOptionalPropertyTypes no se puede asignar undefined a un campo
    // opcional: solo incluimos la propiedad cuando hay valor.
    ...(setup.heroCardId !== undefined && { heroCardId: setup.heroCardId }),
    ...(setup.alterEgoCardId !== undefined && {
      alterEgoCardId: setup.alterEgoCardId,
    }),
    ...(setup.deckId !== undefined && { deckId: setup.deckId }),
  }));
}

/**
 * Crea una partida para cualquier escenario registrado (ver scenarios/). El
 * motor es genérico: toma los datos del villano (estadios, PG por jugador,
 * plan principal, planes secundarios iniciales, mazo de encuentros) de la
 * definición del escenario y construye el GameState.
 *
 * Los PG del villano y el umbral del plan principal escalan ×nº de jugadores;
 * la amenaza inicial del plan principal solo si la carta lo indica
 * (startingThreatPerPlayer). La aceleración por ronda escala aparte, en
 * addThreatStep.
 *
 * El mazo de encuentros se baraja con `options.shuffle` antes de sacar los
 * esbirros de preparación. Por defecto (noShuffle) el motor es determinista y
 * conserva el orden del escenario (tests); la app pasa un barajador real para
 * que no salga siempre la misma carta.
 */
export function createGame(
  scenarioId: string,
  playerSetups: PlayerSetup[],
  difficulty: Difficulty = "STANDARD",
  options: { shuffle?: Shuffle } = {},
): GameState {
  if (playerSetups.length === 0) {
    throw new Error("Se necesita al menos un jugador para crear la partida.");
  }

  const scenario = getScenario(scenarioId);
  if (scenario === undefined) {
    throw new Error(`Escenario desconocido: ${scenarioId}`);
  }

  const playerCount = playerSetups.length;
  const players = buildPlayers(playerSetups);
  const firstPlayer = players[0];
  if (firstPlayer === undefined) {
    throw new Error("Se necesita al menos un jugador para crear la partida.");
  }
  const firstPlayerId = firstPlayer.id;

  const shuffle = options.shuffle ?? noShuffle;
  const startStageName = scenario.progression[difficulty].start;
  // Villano de dos caras (escenario con Entorno de contadores): empieza por la
  // cara A (Norman Osborn), igual que su Entorno (Empresa criminal).
  const environment = initialEnvironment(scenario, playerCount);

  // Un villano en los escenarios normales; varios a la vez en The Wrecking
  // Crew, cada uno con su mazo de encuentros barajado por separado. El
  // primero empieza con el contador activo.
  const multi = scenario.villains !== undefined;
  const single = villainDefinition(scenario);
  const villainDefs = scenario.villains ?? (single !== undefined ? [single] : []);
  const built = villainDefs.map((def) => {
    const stage = def.stages.find((s) => s.stage === startStageName);
    if (stage === undefined) {
      throw new Error(
        `El escenario "${scenario.id}" no define el estadio inicial ${startStageName} de ${def.name}.`,
      );
    }
    const { def: face } = stageFace(def.name, stage, "A");
    const health = stage.healthPerPlayer * playerCount;
    const villain: VillainState = {
      ...(multi && { villainId: def.id }),
      cardId: face.cardId,
      name: def.name,
      stage: stage.stage,
      health,
      maxHealth: health,
      attack: face.attack,
      scheme: face.scheme,
      tough: stage.tough,
      attachments: [],
      immuneWhileDronesPresent: stage.immuneWhileDronesPresent ?? false,
      droneBonus: stage.droneBonus ?? 0,
      ...(environment !== undefined && { face: "A" as const }),
      ...(stage.retaliate !== undefined && { retaliate: stage.retaliate }),
    };
    return {
      def,
      stage,
      face,
      villain,
      deck: shuffle(def.encounterDeck),
    };
  });
  const active = built[0];
  if (active === undefined) {
    throw new Error(`El escenario "${scenario.id}" no define ningún villano.`);
  }

  const mainScheme: SchemeState = {
    id: scenario.mainScheme.id,
    cardId: scenario.mainScheme.cardId,
    name: scenario.mainScheme.name,
    threat: mainSchemeStartingThreat(scenario.mainScheme, playerCount),
    threatToComplete:
      scenario.mainScheme.threatToCompletePerPlayer * playerCount,
    escalationThreat: scenario.mainScheme.escalationThreat,
    isMain: true,
    accelerationTokens: 0,
  };

  // Planes secundarios que entran con el estadio inicial (p.ej. en Experto,
  // Rino arranca en II con "Arramblar con todo" ya en juego).
  const sideSchemes: SchemeState[] = active.stage.sideSchemesOnEnter.map(
    (s) => ({
      id: s.id,
      cardId: s.cardId,
      name: s.name,
      threat: s.threat,
      threatToComplete: s.threatToComplete,
      escalationThreat: s.escalationThreat,
      isMain: false,
      accelerationTokens: s.accelerationTokens,
    }),
  );
  // Planes propios de cada villano (The Wrecking Crew), ligados a su villano.
  const signatureSchemes: SchemeState[] = built.flatMap((b) => {
    const sig = b.def.signatureScheme;
    if (sig === undefined) return [];
    return [
      {
        id: sig.id,
        cardId: sig.cardId,
        name: sig.name,
        threat: sig.startingThreat,
        threatToComplete: 0,
        escalationThreat: 0,
        isMain: false,
        accelerationTokens: 0,
        villainId: b.def.id,
      },
    ];
  });

  // Si el estadio inicial aturde al revelarse (ningún estadio inicial de Rino
  // lo hace, pero lo cubrimos por corrección para futuros villanos).
  const startingPlayers = active.stage.stunAllOnReveal
    ? players.map((p) => ({ ...p, stunned: true }))
    : players;

  let state: GameState = {
    scenarioId: scenario.id,
    ...(environment !== undefined && { environment }),
    ...(multi && {
      reserveVillains: built.slice(1).map((b) => ({
        villain: b.villain,
        encounterDeck: b.deck,
        encounterDiscard: [],
      })),
    }),
    round: 1,
    phase: { name: "PLAYER_PHASE" },
    difficulty,
    firstPlayerId,
    players: startingPlayers,
    villain: active.villain,
    schemes: [mainScheme, ...sideSchemes, ...signatureSchemes],
    minions: [],
    encounterDeck: active.deck,
    encounterDiscard: [],
    pendingEncounterDeals: [],
    reservedNemesis: null,
    eventLog: [],
  };

  // Esbirros de preparación (La fórmula mutagénica: un Esclavo duende por
  // jugador), sacados del mazo de encuentros. No se registran en el eventLog:
  // son parte del estado inicial, igual que los planes secundarios de inicio.
  for (const player of players) {
    for (const cardId of scenario.setupMinionsPerPlayer ?? []) {
      state = putEncounterMinionIntoPlay(state, cardId, player.id).state;
    }
  }

  // "Cuando se muestre" del estadio inicial declarado en datos (p.ej. La
  // fórmula mutagénica en Experto empieza en II y reparte 2 cartas de
  // encuentro a cada jugador; se revelan en el paso 4 de la primera ronda).
  return revealVillainFace(state, active.face).state;
}

/**
 * Compatibilidad: crea una partida de Rino para 1-4 jugadores. Es un
 * envoltorio de createGame("rhino", …) — el resultado es idéntico al del
 * createRhinoGame original.
 */
export function createRhinoGame(
  playerSetups: PlayerSetup[],
  difficulty: Difficulty = "STANDARD",
): GameState {
  return createGame("rhino", playerSetups, difficulty);
}

/**
 * Compatibilidad con el código y tests existentes de 1 jugador (Spider-Man).
 * Envoltorio de createRhinoGame con un único PlayerSetup — comportamiento
 * idéntico al de antes (10 PG de héroe, Rino 14/15 PG, umbral 7).
 */
export function createSpiderManVsRhinoGame(
  playerId: string = "player-1",
  difficulty: Difficulty = "STANDARD",
): GameState {
  return createRhinoGame(
    [
      {
        id: playerId,
        heroName: "Spider-Man",
        alterEgoName: "Peter Parker",
        health: 10,
        heroCardId: "01001a",
        alterEgoCardId: "01001b",
      },
    ],
    difficulty,
  );
}

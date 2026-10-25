import type { GamePhase, VillainStage } from "../domain/types.ts";
export type GameEvent =
  | { type: "ROUND_STARTED"; round: number }
  | { type: "PHASE_CHANGED"; from: GamePhase; to: GamePhase }
  | { type: "THREAT_ADDED"; schemeId: string; amount: number }
  | { type: "THREAT_REMOVED"; schemeId: string; amount: number }
  | { type: "DAMAGE_DEALT"; targetId: string; amount: number; source: string }
  | { type: "HEALTH_HEALED"; targetId: string; amount: number; source: string }
  | { type: "VILLAIN_ATTACKED"; playerId: string; amount: number }
  | { type: "VILLAIN_SCHEMED"; schemeId: string; amount: number }
  | { type: "BOOST_CARD_REVEALED"; cardId: string; boostValue: number }
  | { type: "ENCOUNTER_CARD_DEALT"; playerId: string }
  | { type: "ENCOUNTER_DECK_RESHUFFLED"; schemeId: string }
  | { type: "VILLAIN_STAGE_CHANGED"; from: VillainStage; to: VillainStage }
  | { type: "SIDE_SCHEME_ENTERED"; schemeId: string; name: string }
  | { type: "STATUS_GAINED"; targetId: string; status: "TOUGH" | "STUNNED" }
  | { type: "STATUS_REMOVED"; targetId: string; status: "TOUGH" | "STUNNED" }
  | { type: "CARD_GAINED_SURGE"; cardName: string }
  | { type: "UPGRADE_DISCARDED"; playerId: string; upgradeId: string }
  | { type: "DAMAGE_REDIRECTED"; toAttachmentId: string; amount: number }
  | { type: "ATTACHMENT_DISCARDED"; attachmentId: string }
  | { type: "ATTACK_BLOCKED_BY_GUARD"; minionId: string; minionName: string }
  // --- Biblioteca simulada del jugador (ver game/playerLibrary.ts) ---
  // Mano inicial robada y biblioteca formada al empezar la partida con mazo.
  | {
      type: "LIBRARY_INITIALIZED";
      playerId: string;
      librarySize: number;
      handSize: number;
    }
  // Robo de N cartas de la cima de la biblioteca a la mano. `count` es cuántas
  // se robaron de verdad (puede ser menos de lo pedido si no había bastantes).
  | { type: "CARDS_DRAWN"; playerId: string; count: number }
  // La biblioteca se agotó y se barajó el descarte para formar una nueva
  // (regla oficial; sin penalización de derrota, a diferencia del villano).
  | { type: "LIBRARY_RESHUFFLED"; playerId: string }
  // Carta retirada de la mano al jugarse (el motor no modela aún su zona de
  // juego; la app decide dónde va visualmente).
  | { type: "CARD_PLAYED"; playerId: string; cardCode: string }
  // Carta de la mano enviada a la pila de descarte.
  | { type: "CARD_DISCARDED"; playerId: string; cardCode: string }
  // El plan principal alcanzó su umbral y avanzó a la siguiente etapa (planes
  // de varias etapas, p.ej. Klaw: 01116 → 01117). from/to son cardId.
  | {
      type: "MAIN_SCHEME_ADVANCED";
      from: string;
      to: string;
      schemeId: string;
    }
  // --- Drones (Ultron, ver game/drones.ts) ---
  // Se creó un Esbirro Dron poniendo boca abajo la carta superior de la
  // biblioteca del jugador. cardCode es esa carta (queda oculta como dron).
  | {
      type: "DRONE_CREATED";
      playerId: string;
      minionId: string;
      cardCode: string;
    }
  // Un Dron fue derrotado: su carta boca abajo vuelve al descarte de su dueño.
  | { type: "DRONE_RETURNED"; playerId: string; cardCode: string }
  // Ataque anulado: el villano no puede sufrir daño mientras haya un Dron en
  // juego (habilidad de Ultron III).
  | { type: "ATTACK_BLOCKED_BY_DRONES"; villainName: string }
  // --- Villano de dos caras + Entorno con contadores (game/villainFaces.ts) ---
  // Cambian los contadores del Entorno. delta es el cambio real (no baja de
  // 0); counters, el total resultante.
  | {
      type: "ENVIRONMENT_COUNTERS_CHANGED";
      environmentName: string;
      counterName: string;
      delta: number;
      counters: number;
    }
  // El Entorno se quedó sin contadores: el villano y el Entorno se dan la
  // vuelta (from/to son nombres del villano y del Entorno).
  | {
      type: "VILLAIN_FLIPPED";
      from: string;
      to: string;
      environmentFrom: string;
      environmentTo: string;
    }
  // Una Interrupción obligada sustituye la activación del villano por mover
  // contadores del Entorno (Norman ataca → Infamia; Duende maquina → Locura).
  | {
      type: "VILLAIN_ACTIVATION_REPLACED";
      villainName: string;
      replaced: "ATTACK" | "SCHEME";
      counterName: string;
      delta: number;
    }
  // El daño que iba a sufrir el villano se sustituye por quitar contadores del
  // Entorno (Norman Osborn). amount = daño sustituido.
  | {
      type: "VILLAIN_DAMAGE_REPLACED";
      villainName: string;
      amount: number;
      counterName: string;
    }
  // --- Varios villanos a la vez (game/multiVillain.ts) ---
  // El contador activo pasa a otro villano. tiedWith: otros villanos
  // empatados con el elegido (el jugador inicial puede cambiar la elección).
  | {
      type: "ACTIVE_VILLAIN_CHANGED";
      fromVillainId: string;
      toVillainId: string;
      villainName: string;
      tiedWith: string[];
    }
  // Un villano del grupo es derrotado y sale de juego con su plan propio.
  | { type: "VILLAIN_DEFEATED"; villainId: string; villainName: string }
  // Un plan secundario propio llegó a su umbral: dispara su efecto y se
  // reduce (guided = efecto que se resuelve a mano con la carta).
  | {
      type: "SIGNATURE_SCHEME_TRIGGERED";
      schemeId: string;
      name: string;
      resetTo: number;
      guided: boolean;
    }
  // --- Esbirros y biblioteca ---
  // Un esbirro entra en juego por un efecto de carta o en la preparación.
  | {
      type: "MINION_ENTERED_PLAY";
      minionId: string;
      cardId: string;
      name: string;
      playerId: string;
    }
  // Se descartan cartas de la cima de la biblioteca simulada de un jugador.
  | { type: "PLAYER_DECK_MILLED"; playerId: string; count: number };

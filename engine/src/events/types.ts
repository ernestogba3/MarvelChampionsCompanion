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
  | { type: "CARD_DISCARDED"; playerId: string; cardCode: string };

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
  | { type: "ENCOUNTER_CARD_DEALT"; playerId: string }
  | { type: "VILLAIN_STAGE_CHANGED"; from: VillainStage; to: VillainStage }
  | { type: "SIDE_SCHEME_ENTERED"; schemeId: string; name: string }
  | { type: "STATUS_GAINED"; targetId: string; status: "TOUGH" | "STUNNED" }
  | { type: "STATUS_REMOVED"; targetId: string; status: "TOUGH" | "STUNNED" }
  | { type: "CARD_GAINED_SURGE"; cardName: string }
  | { type: "UPGRADE_DISCARDED"; playerId: string; upgradeId: string }
  | { type: "DAMAGE_REDIRECTED"; toAttachmentId: string; amount: number }
  | { type: "ATTACHMENT_DISCARDED"; attachmentId: string };

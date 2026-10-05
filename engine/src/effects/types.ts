export type EffectTarget =
  | { kind: "VILLAIN" }
  | { kind: "PLAYER"; playerId: string }
  | { kind: "MAIN_SCHEME" }
  | { kind: "SCHEME"; schemeId: string };
export type Effect =
  | {
      type: "DEAL_DAMAGE";
      target: EffectTarget;
      amount: number;
      source: string;
    }
  | { type: "HEAL"; target: EffectTarget; amount: number; source: string }
  | { type: "ADD_THREAT"; target: EffectTarget; amount: number }
  | { type: "GAIN_STATUS"; target: EffectTarget; status: "TOUGH" | "STUNNED" }
  | { type: "GAIN_SURGE"; cardName: string }
  | { type: "QUEUE_ENCOUNTER_CARD"; playerId: string }
  | { type: "DISCARD_UPGRADE"; playerId: string; upgradeId: string };

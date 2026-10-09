export type CardType =
  | "VILLAIN"
  | "MAIN_SCHEME"
  | "SIDE_SCHEME"
  | "MINION"
  | "TREACHERY"
  | "ATTACHMENT";
export type EncounterSet = "RHINO" | "STANDARD";
export interface CardDefinition {
  id: string;
  nameEn: string;
  nameEs: string;
  type: CardType;
  set: EncounterSet;
  traits?: string[];
  attack?: number;
  scheme?: number;
  health?: number;
  startingThreat?: number;
  escalationThreat?: number;
  threatToComplete?: number;
  boost?: number;
}
export const CARD_CATALOG: Record<string, CardDefinition> = {
  "01094": {
    id: "01094",
    nameEn: "Rhino (I)",
    nameEs: "Rino (I)",
    type: "VILLAIN",
    set: "RHINO",
    traits: ["Brute", "Criminal"],
    attack: 2,
    scheme: 1,
    health: 14,
  },
  "01095": {
    id: "01095",
    nameEn: "Rhino (II)",
    nameEs: "Rino (II)",
    type: "VILLAIN",
    set: "RHINO",
    traits: ["Brute", "Criminal"],
    attack: 3,
    scheme: 1,
    health: 15,
  },
  "01096": {
    id: "01096",
    nameEn: "Rhino (III)",
    nameEs: "Rino (III)",
    type: "VILLAIN",
    set: "RHINO",
    traits: ["Brute", "Criminal"],
    attack: 4,
    scheme: 1,
    health: 16,
  },
  "01097": {
    id: "01097",
    nameEn: "The Break-In!",
    nameEs: "¡Allanamiento!",
    type: "MAIN_SCHEME",
    set: "RHINO",
    startingThreat: 0,
    escalationThreat: 1,
    threatToComplete: 7,
  },
  "01098": {
    id: "01098",
    nameEn: "Armored Rhino Suit",
    nameEs: "Piel blindada del Rino",
    type: "ATTACHMENT",
    set: "RHINO",
    traits: ["Armor"],
    boost: 0,
  },
  "01099": {
    id: "01099",
    nameEn: "Charge",
    nameEs: "Embestida",
    type: "ATTACHMENT",
    set: "RHINO",
    boost: 2,
  },
  "01100": {
    id: "01100",
    nameEn: "Enhanced Ivory Horn",
    nameEs: "Cuerno de marfil mejorado",
    type: "ATTACHMENT",
    set: "RHINO",
    traits: ["Weapon"],
    boost: 2,
  },
  "01101": {
    id: "01101",
    nameEn: "Hydra Mercenary",
    nameEs: "Mercenario de Hydra",
    type: "MINION",
    set: "RHINO",
    traits: ["Hydra"],
    attack: 1,
    scheme: 0,
    health: 3,
    boost: 1,
  },
  "01102": {
    id: "01102",
    nameEn: "Sandman",
    nameEs: "Hombre de Arena",
    type: "MINION",
    set: "RHINO",
    traits: ["Criminal", "Elite"],
    attack: 3,
    scheme: 2,
    health: 4,
    boost: 2,
  },
  "01103": {
    id: "01103",
    nameEn: "Shocker",
    nameEs: "Conmocionador",
    type: "MINION",
    set: "RHINO",
    traits: ["Criminal"],
    attack: 2,
    scheme: 1,
    health: 3,
    boost: 2,
  },
  "01104": {
    id: "01104",
    nameEn: "Hard to Keep Down",
    nameEs: "Difícil de tumbar",
    type: "TREACHERY",
    set: "RHINO",
    boost: 0,
  },
  "01105": {
    id: "01105",
    nameEn: '"I\'m Tough"',
    nameEs: '"¡Soy duro!"',
    type: "TREACHERY",
    set: "RHINO",
    boost: 0,
  },
  "01106": {
    id: "01106",
    nameEn: "Stampede",
    nameEs: "Estampida",
    type: "TREACHERY",
    set: "RHINO",
    boost: 1,
  },
  "01107": {
    id: "01107",
    nameEn: "Breakin' & Takin'",
    nameEs: "Arramblar con todo",
    type: "SIDE_SCHEME",
    set: "RHINO",
    startingThreat: 2,
    boost: 2,
  },
  "01108": {
    id: "01108",
    nameEn: "Crowd Control",
    nameEs: "Control de multitudes",
    type: "SIDE_SCHEME",
    set: "RHINO",
    startingThreat: 2,
    boost: 2,
  },
  "01186": {
    id: "01186",
    nameEn: "Advance",
    nameEs: "Mover ficha",
    type: "TREACHERY",
    set: "STANDARD",
    boost: 0,
  },
  "01187": {
    id: "01187",
    nameEn: "Assault",
    nameEs: "Agresión",
    type: "TREACHERY",
    set: "STANDARD",
    boost: 0,
  },
  "01188": {
    id: "01188",
    nameEn: "Caught Off Guard",
    nameEs: "Con la guardia baja",
    type: "TREACHERY",
    set: "STANDARD",
    boost: 1,
  },
  "01189": {
    id: "01189",
    nameEn: "Gang-Up",
    nameEs: "Todos a una",
    type: "TREACHERY",
    set: "STANDARD",
    boost: 1,
  },
  "01190": {
    id: "01190",
    nameEn: "Shadow of the Past",
    nameEs: "Una sombra del pasado",
    type: "TREACHERY",
    set: "STANDARD",
    boost: 2,
  },
};
export function getCardDefinition(id: string): CardDefinition | undefined {
  return CARD_CATALOG[id];
}

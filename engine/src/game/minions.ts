import type { MinionState } from "../domain/types";
export function createHydraMercenary(
  id: string,
  engagedWith: string | null,
): MinionState {
  return {
    id,
    cardId: "01101",
    name: "Mercenario de Hydra",
    attack: 1,
    scheme: 0,
    health: 3,
    maxHealth: 3,
    engagedWith,
    tough: false,
    guard: true,
  };
}
export function createSandman(
  id: string,
  engagedWith: string | null,
): MinionState {
  return {
    id,
    cardId: "01102",
    name: "Hombre de Arena",
    attack: 3,
    scheme: 2,
    health: 4,
    maxHealth: 4,
    engagedWith,
    tough: true,
    guard: false,
  };
}
export function createShocker(
  id: string,
  engagedWith: string | null,
): MinionState {
  return {
    id,
    cardId: "01103",
    name: "Conmocionador",
    attack: 2,
    scheme: 1,
    health: 3,
    maxHealth: 3,
    engagedWith,
    tough: false,
    guard: false,
  };
}

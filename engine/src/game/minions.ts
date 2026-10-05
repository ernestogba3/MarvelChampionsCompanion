import type { MinionState } from "../domain/types.ts";

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
    // entra en juego con un estado de dureza
    guard: false,
  };
}

export function createShocker(id: string): MinionState {
  return {
    id,
    cardId: "01103",
    name: "Conmocionador",
    attack: 2,
    scheme: 1,
    health: 3,
    maxHealth: 3,
    engagedWith: null,
    tough: false,
    guard: false,
  };
}

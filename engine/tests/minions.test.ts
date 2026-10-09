import { describe, it, expect } from "vitest";
import { createSandman } from "../src/game/minions";
describe("TC-015: Hombre de Arena entra con dureza", () => {
  it("se crea con el estado de dureza activo y sus valores reales", () => {
    const minion = createSandman("minion-1", "player-1");
    expect(minion.tough).toBe(true);
    expect(minion.attack).toBe(3);
    expect(minion.scheme).toBe(2);
    expect(minion.health).toBe(4);
  });
});

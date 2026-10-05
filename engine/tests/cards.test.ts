import { describe, it, expect } from "vitest";
import { CARD_CATALOG, getCardDefinition } from "../src/data/cards.ts";
describe("Catálogo de cartas (Fase 4)", () => {
  it("contiene las 20 cartas documentadas", () => {
    expect(Object.keys(CARD_CATALOG)).toHaveLength(20);
  });
  it("Rino (I) tiene los valores reales", () => {
    const card = getCardDefinition("01094");
    expect(card?.nameEs).toBe("Rino (I)");
    expect(card?.health).toBe(14);
  });
  it('"¡Soy duro!" es un tratado del set Rino', () => {
    const card = getCardDefinition("01105");
    expect(card?.type).toBe("TREACHERY");
    expect(card?.set).toBe("RHINO");
  });
  it("getCardDefinition devuelve undefined para un id desconocido", () => {
    expect(getCardDefinition("99999")).toBeUndefined();
  });
});

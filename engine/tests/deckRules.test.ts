import { describe, it, expect } from "vitest";
import {
  validateDeck,
  type CardIndex,
  type DeckDefinition,
} from "../src/deck/deckRules";

// Índice de prueba: un héroe (Spider-Man) con identidad, alter ego y dos
// específicas; una específica de otro héroe; cartas de dos aspectos; una
// carta de encuentro; y 20 básicas con límite 3.
const BASIC_CODES = Array.from({ length: 20 }, (_, i) => `basic-${i}`);

const index: CardIndex = {
  "01001a": {
    code: "01001a",
    title: "Spider-Man",
    factionCode: "hero",
    heroSetCode: "spider_man",
    deckLimit: 0,
    isIdentity: true,
  },
  "01001b": {
    code: "01001b",
    title: "Peter Parker",
    factionCode: "hero",
    heroSetCode: "spider_man",
    deckLimit: 0,
    isIdentity: true,
  },
  "01002": {
    code: "01002",
    title: "Tela de araña",
    factionCode: "hero",
    heroSetCode: "spider_man",
    deckLimit: 2,
    isIdentity: false,
  },
  "01003": {
    code: "01003",
    title: "Otra específica",
    factionCode: "hero",
    heroSetCode: "spider_man",
    deckLimit: 1,
    isIdentity: false,
  },
  "01004": {
    code: "01004",
    title: "Carta ajena",
    factionCode: "hero",
    heroSetCode: "other_hero",
    deckLimit: 1,
    isIdentity: false,
  },
  "01010": {
    code: "01010",
    title: "Golpe",
    factionCode: "aggression",
    heroSetCode: null,
    deckLimit: 3,
    isIdentity: false,
  },
  "01020": {
    code: "01020",
    title: "Justicia X",
    factionCode: "justice",
    heroSetCode: null,
    deckLimit: 2,
    isIdentity: false,
  },
  "01099": {
    code: "01099",
    title: "Encuentro",
    factionCode: "encounter",
    heroSetCode: null,
    deckLimit: 0,
    isIdentity: false,
  },
  ...Object.fromEntries(
    BASIC_CODES.map((code, i) => [
      code,
      {
        code,
        title: `Básica ${i}`,
        factionCode: "basic",
        heroSetCode: null,
        deckLimit: 3,
        isIdentity: false,
      },
    ]),
  ),
};

const sum = (cards: Record<string, number>) =>
  Object.values(cards).reduce((a, b) => a + b, 0);

/**
 * Completa un conjunto de cartas con básicas hasta exactamente `target`,
 * respetando el límite de 3 copias por básica.
 */
function pad(
  cards: Record<string, number>,
  target = 40,
): Record<string, number> {
  const out = { ...cards };
  let total = sum(out);
  for (const code of BASIC_CODES) {
    if (total >= target) break;
    const have = out[code] ?? 0;
    const add = Math.min(3 - have, target - total);
    if (add <= 0) continue;
    out[code] = have + add;
    total += add;
  }
  return out;
}

/** Mazo válido base: 40 cartas, aspecto agresión, específicas completas. */
function baseDeck(cards: Record<string, number> = {}): DeckDefinition {
  return {
    id: "test",
    name: "Mazo de prueba",
    heroCode: "01001a",
    heroSetCode: "spider_man",
    aspect: "aggression",
    cards: pad({ "01002": 2, "01003": 1, "01010": 3, ...cards }),
  };
}

describe("validateDeck", () => {
  it("acepta un mazo válido de 40 cartas", () => {
    const result = validateDeck(baseDeck(), index);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.totalCards).toBe(40);
  });

  it("acepta un mazo de 50 cartas, el máximo", () => {
    const deck = baseDeck();
    deck.cards = pad(deck.cards, 50);
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(true);
    expect(result.totalCards).toBe(50);
  });

  it("rechaza un mazo de menos de 40 cartas", () => {
    const deck = baseDeck();
    deck.cards = pad({ "01002": 2, "01003": 1, "01010": 3 }, 39);
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(result.totalCards).toBe(39);
    expect(result.errors.some((e) => e.includes("necesita al menos 40"))).toBe(
      true,
    );
  });

  it("rechaza un mazo de más de 50 cartas", () => {
    const deck = baseDeck();
    deck.cards = pad(deck.cards, 51);
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes("no puede tener más de 50")),
    ).toBe(true);
  });

  it("rechaza más copias que el límite del título", () => {
    const deck = baseDeck({ "01010": 4 });
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Máximo 3 de «Golpe» (tienes 4).");
  });

  it("rechaza cartas de dos aspectos distintos", () => {
    const deck = baseDeck({ "01020": 2 });
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes("Solo se permite un aspecto")),
    ).toBe(true);
  });

  it("rechaza un aspecto declarado que no coincide con las cartas", () => {
    const deck = baseDeck();
    deck.aspect = "justice";
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes("declarado como justice")),
    ).toBe(true);
  });

  it("rechaza cartas específicas de otro héroe", () => {
    const deck = baseDeck({ "01004": 1 });
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "«Carta ajena» es una carta de otro héroe.",
    );
  });

  it("exige todas las cartas específicas del héroe", () => {
    const deck = baseDeck();
    deck.cards = pad({ "01002": 2, "01010": 3 });
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Falta una carta específica del héroe: «Otra específica».",
    );
  });

  it("rechaza la carta de identidad dentro del mazo y no la cuenta", () => {
    const deck = baseDeck();
    deck.cards["01001a"] = 1;
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "«Spider-Man» es una carta de identidad y no va en el mazo.",
    );
    expect(result.totalCards).toBe(40);
  });

  it("rechaza códigos que no están en el índice", () => {
    const deck = baseDeck({ "99999": 1 });
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Carta desconocida en el mazo: 99999.");
  });

  it("rechaza cartas que no son de jugador", () => {
    const deck = baseDeck({ "01099": 1 });
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "«Encuentro» no es una carta válida para un mazo de jugador.",
    );
  });

  it("ignora entradas con cantidad 0", () => {
    const deck = baseDeck({ "01004": 0 });
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(true);
    expect(result.totalCards).toBe(40);
  });

  it("acepta un mazo sin aspecto, solo con básicas y específicas", () => {
    const deck: DeckDefinition = {
      id: "solo-basicas",
      name: "Solo básicas",
      heroCode: "01001a",
      heroSetCode: "spider_man",
      aspect: null,
      cards: pad({ "01002": 2, "01003": 1 }),
    };
    const result = validateDeck(deck, index);
    expect(result.ok).toBe(true);
  });

  it("reporta copias que faltan en la colección, agrupadas por título", () => {
    const result = validateDeck(baseDeck(), index, { "01010": 1 });
    expect(result.ok).toBe(true);
    expect(result.missing).toContainEqual({
      title: "Golpe",
      needed: 3,
      owned: 1,
    });
  });

  it("no reporta faltantes cuando la colección cubre el mazo", () => {
    const deck = baseDeck();
    const owned = Object.fromEntries(
      Object.entries(deck.cards).map(([code, qty]) => [code, qty]),
    );
    const result = validateDeck(deck, index, owned);
    expect(result.missing).toEqual([]);
  });
});

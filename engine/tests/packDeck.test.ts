import { describe, it, expect } from "vitest";
import {
  buildPackDeck,
  deckSize,
  isDeckEligibleCard,
  packAspects,
  type PackCardInfo,
} from "../src/deck/packDeck";

// Catálogo sintético con la forma de marvelcdb: un pack de héroe ("cap")
// con su identidad, cartas propias, némesis/obligación (encuentro), su
// aspecto principal, unas pocas cartas de otros aspectos y básicas.
function card(
  code: string,
  factionCode: string,
  quantity: number,
  extra: Partial<PackCardInfo> = {},
): PackCardInfo {
  return {
    code,
    packCode: "cap",
    typeCode: "event",
    factionCode,
    setCode: null,
    quantity,
    deckLimit: 3,
    ...extra,
  };
}

const CAP: PackCardInfo[] = [
  card("03001a", "hero", 1, { typeCode: "hero", setCode: "captain_america", deckLimit: 0 }),
  card("03001b", "hero", 1, { typeCode: "alter_ego", setCode: "captain_america", deckLimit: 0 }),
  card("03002", "hero", 1, { typeCode: "ally", setCode: "captain_america", deckLimit: 1 }),
  card("03004", "hero", 3, { setCode: "captain_america" }),
  card("03010", "hero", 2, { typeCode: "upgrade", setCode: "captain_america" }),
  // Obligación del héroe y set de némesis: cartas de encuentro.
  card("03026", "encounter", 1, { typeCode: "obligation", setCode: "captain_america" }),
  card("03027", "encounter", 1, { typeCode: "minion", setCode: "red_skull_nemesis" }),
  // Aspecto principal del pack y extras de los otros aspectos.
  card("03015", "leadership", 3),
  card("03019", "leadership", 3),
  card("03012", "leadership", 1, { typeCode: "ally", deckLimit: 1 }),
  card("03031", "aggression", 3),
  card("03032", "justice", 3),
  // Básicas: una con más copias en el pack que su límite.
  card("03024", "basic", 1, { typeCode: "support", deckLimit: 1 }),
  card("03025", "basic", 4),
  // Básica con set: es de un escenario, no del héroe.
  card("03099", "basic", 2, { setCode: "scenario_leader" }),
  // Otro pack (Core Set): no entra.
  card("01088", "leadership", 2, { packCode: "core" }),
  // Reimpresión de una carta del héroe en otro pack: no se cuenta dos veces.
  card("99004", "hero", 3, { packCode: "reprint", setCode: "captain_america" }),
];

describe("Mazo del pack", () => {
  it("cartas del héroe exactas + aspecto principal del pack + básicas del pack", () => {
    const deck = buildPackDeck("03001a", CAP)!;
    expect(deck.aspect).toBe("leadership");
    expect(deck.heroSetCode).toBe("captain_america");
    expect(deck.cards).toEqual({
      "03002": 1,
      "03004": 3,
      "03010": 2,
      "03015": 3,
      "03019": 3,
      "03012": 1,
      "03024": 1,
      "03025": 3,
    });
    expect(deckSize(deck)).toBe(17);
  });

  it("no incluye identidad, encuentro, otros aspectos, básicas con set, otros packs ni reimpresiones", () => {
    const deck = buildPackDeck("03001a", CAP)!;
    for (const code of ["03001a", "03001b", "03026", "03027", "03031", "03032", "03099", "01088", "99004"]) {
      expect(deck.cards[code]).toBeUndefined();
    }
  });

  it("respeta el límite de copias por carta (deck_limit)", () => {
    expect(buildPackDeck("03001a", CAP)!.cards["03025"]).toBe(3);
  });

  it("se puede elegir otro aspecto del pack", () => {
    const deck = buildPackDeck("03001a", CAP, "justice")!;
    expect(deck.aspect).toBe("justice");
    expect(deck.cards["03032"]).toBe(3);
    expect(deck.cards["03015"]).toBeUndefined();
    expect(deck.id).toBe("pack-03001a-justice");
  });

  it("sin aspecto (null): solo cartas del héroe y básicas", () => {
    const deck = buildPackDeck("03001a", CAP, null)!;
    expect(deck.aspect).toBeNull();
    expect(Object.keys(deck.cards).sort()).toEqual(
      ["03002", "03004", "03010", "03024", "03025"].sort(),
    );
    expect(deck.id).toBe("pack-03001a-basic");
  });

  it("héroe desconocido → null", () => {
    expect(buildPackDeck("00000a", CAP)).toBeNull();
    expect(packAspects("00000a", CAP)).toEqual([]);
  });

  it("packAspects: de más a menos copias; en empate, orden de los aspectos", () => {
    expect(packAspects("03001a", CAP)).toEqual([
      { aspect: "leadership", copies: 7 },
      { aspect: "aggression", copies: 3 },
      { aspect: "justice", copies: 3 },
    ]);
  });

  it("cartas propias del héroe con color de aspecto (Spider-Woman) entran siempre", () => {
    const sw: PackCardInfo[] = [
      card("04031a", "hero", 1, { packCode: "trors", typeCode: "hero", setCode: "spider_woman", deckLimit: 0 }),
      card("04033", "hero", 2, { packCode: "trors", setCode: "spider_woman" }),
      card("04035", "aggression", 2, { packCode: "trors", setCode: "spider_woman" }),
      card("04036", "leadership", 2, { packCode: "trors", setCode: "spider_woman" }),
      card("04050", "justice", 3, { packCode: "trors" }),
    ];
    const deck = buildPackDeck("04031a", sw)!;
    // Las de su set no cuentan como aspecto del pack: el aspecto es justicia.
    expect(deck.aspect).toBe("justice");
    expect(deck.cards).toEqual({ "04033": 2, "04035": 2, "04036": 2, "04050": 3 });
  });
});

describe("isDeckEligibleCard (editor de mazos)", () => {
  // Héroe "captain_america"; el editor ofrece cartas de CUALQUIER pack, no
  // solo del suyo.
  const hero = "captain_america";
  const c = (
    factionCode: string,
    extra: Partial<PackCardInfo> = {},
  ): PackCardInfo => ({
    code: "x",
    packCode: "otro",
    typeCode: "event",
    factionCode,
    setCode: null,
    quantity: 1,
    deckLimit: 3,
    ...extra,
  });

  it("acepta las cartas propias del héroe (su set)", () => {
    expect(isDeckEligibleCard(c("hero", { setCode: hero }), hero, "leadership")).toBe(true);
  });

  it("rechaza cartas de héroe de OTRO set", () => {
    expect(isDeckEligibleCard(c("hero", { setCode: "thor" }), hero, "leadership")).toBe(false);
  });

  it("acepta cartas genéricas del aspecto elegido, de cualquier pack", () => {
    expect(isDeckEligibleCard(c("leadership"), hero, "leadership")).toBe(true);
  });

  it("rechaza cartas de un aspecto distinto del elegido", () => {
    expect(isDeckEligibleCard(c("aggression"), hero, "leadership")).toBe(false);
  });

  it("acepta cartas de aspecto 'de color' del propio héroe (Spider-Woman)", () => {
    expect(
      isDeckEligibleCard(c("aggression", { setCode: "spider_woman" }), "spider_woman", "aggression"),
    ).toBe(true);
  });

  it("rechaza cartas de aspecto 'de color' de OTRO héroe", () => {
    expect(
      isDeckEligibleCard(c("aggression", { setCode: "spider_woman" }), hero, "aggression"),
    ).toBe(false);
  });

  it("acepta básicas genéricas sea cual sea el aspecto", () => {
    expect(isDeckEligibleCard(c("basic"), hero, null)).toBe(true);
    expect(isDeckEligibleCard(c("basic"), hero, "justice")).toBe(true);
  });

  it("rechaza básicas ligadas a un escenario (set de líder de Civil War)", () => {
    expect(
      isDeckEligibleCard(c("basic", { setCode: "iron_man_leader" }), hero, "leadership"),
    ).toBe(false);
  });

  it("rechaza identidades, encuentro, campaña y aspecto 'pool' (Masacre)", () => {
    expect(isDeckEligibleCard(c("hero", { typeCode: "hero", setCode: hero }), hero, "leadership")).toBe(false);
    expect(isDeckEligibleCard(c("hero", { typeCode: "alter_ego", setCode: hero }), hero, "leadership")).toBe(false);
    expect(isDeckEligibleCard(c("encounter", { setCode: hero }), hero, "leadership")).toBe(false);
    expect(isDeckEligibleCard(c("campaign"), hero, "leadership")).toBe(false);
    expect(isDeckEligibleCard(c("pool"), hero, "leadership")).toBe(false);
  });

  it("sin aspecto (null): solo cartas del héroe y básicas genéricas", () => {
    expect(isDeckEligibleCard(c("leadership"), hero, null)).toBe(false);
    expect(isDeckEligibleCard(c("basic"), hero, null)).toBe(true);
    expect(isDeckEligibleCard(c("hero", { setCode: hero }), hero, null)).toBe(true);
  });
});

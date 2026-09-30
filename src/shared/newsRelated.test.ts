import { describe, it, expect } from "vitest";
import {
  tagEqualsTeamName,
  tagWordsInPlayerName,
  tagMentionsBothTeams,
  textMentionsBothTeams,
} from "./newsRelated";

describe("tagEqualsTeamName (team news: tag-only)", () => {
  it("matches exact team tag", () => {
    expect(tagEqualsTeamName("تراکتور", "تراکتور")).toBe(true);
  });
  it("ignores # prefix and underscores", () => {
    expect(tagEqualsTeamName("#استقلال", "استقلال")).toBe(true);
    expect(tagEqualsTeamName("علی_علیپور", "علی علیپور")).toBe(true);
  });
  it("rejects keyword-style partial tags", () => {
    expect(tagEqualsTeamName("استقلال تهران", "استقلال")).toBe(false);
    expect(tagEqualsTeamName("پرسپولیس", "استقلال")).toBe(false);
  });
});

describe("tagWordsInPlayerName (player news: tag-only, fuzzy)", () => {
  it("matches plain spaced tags", () => {
    expect(tagWordsInPlayerName("علی علیپور", "علی علیپور")).toBe(true);
  });
  it("matches near tags (profile has extra first name)", () => {
    expect(tagWordsInPlayerName("حسین حسینی", "سید حسین حسینی")).toBe(true);
  });
  it("rejects unrelated tags", () => {
    expect(tagWordsInPlayerName("مهدی طارمی", "علی علیپور")).toBe(false);
    expect(tagWordsInPlayerName("", "علی علیپور")).toBe(false);
  });
});

describe("textMentionsBothTeams (match news: text keywords, both required)", () => {
  const news = {
    title: "حواشی دیدار استقلال و سپاهان",
    summary: "بازی بزرگ هفته",
    content: "استقلال در خانه از سپاهان پذیرایی می‌کند",
  };
  it("matches when both teams are in the text", () => {
    expect(textMentionsBothTeams(news, "استقلال", "سپاهان")).toBe(true);
  });
  it("rejects when only one team is mentioned", () => {
    expect(textMentionsBothTeams(news, "استقلال", "پرسپولیس")).toBe(false);
    expect(textMentionsBothTeams({ title: "برد استقلال" }, "استقلال", "سپاهان")).toBe(false);
  });
});

describe("tagMentionsBothTeams (match news: tag-only, both team tags required)", () => {
  it("matches when both team tags are present", () => {
    const news = { tags: ["لیگ برتر", "پرسپولیس", "تراکتور"] };
    expect(tagMentionsBothTeams(news, "پرسپولیس", "تراکتور")).toBe(true);
  });
  it("matches regardless of tag order and underscores", () => {
    const news = { tags: ["تراکتور", "پرسپولیس", "کمیته انضباطی"] };
    expect(tagMentionsBothTeams(news, "پرسپولیس", "تراکتور")).toBe(true);
    expect(tagMentionsBothTeams({ tags: ["پرسپولیس_تهران"] }, "پرسپولیس تهران", "تراکتور")).toBe(false);
  });
  it("rejects when only one team tag exists", () => {
    expect(tagMentionsBothTeams({ tags: ["پرسپولیس", "استقلال"] }, "پرسپولیس", "تراکتور")).toBe(false);
  });
  it("rejects news without tags", () => {
    expect(tagMentionsBothTeams({}, "پرسپولیس", "تراکتور")).toBe(false);
  });
});

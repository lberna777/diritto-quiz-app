import { describe, it, expect } from "vitest";
import { grade, shuffle, fmtPts } from "./quiz";
import { nextBox, BOX_INTERVAL_DAYS } from "./srs";

describe("scoring", () => {
  it("calcola il voto su scala", () => {
    expect(grade(22, 22, 30)).toBe(30);
    expect(grade(11, 22, 30)).toBe(15);
    expect(grade(0, 22, 30)).toBe(0);
    expect(grade(0, 0, 30)).toBe(0);
  });

  it("formatta i punti all'italiana", () => {
    expect(fmtPts(1.5)).toBe("1,5");
    expect(fmtPts(33)).toBe("33,0");
  });
});

describe("shuffle", () => {
  it("preserva tutti gli elementi", () => {
    const a = [1, 2, 3, 4, 5];
    const s = shuffle(a);
    expect(s.slice().sort()).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5]); // non muta l'originale
  });
});

describe("leitner", () => {
  it("promuove di un box se corretto, max 5", () => {
    expect(nextBox(1, true)).toBe(2);
    expect(nextBox(4, true)).toBe(5);
    expect(nextBox(5, true)).toBe(5);
  });

  it("torna al box 1 se sbagliato", () => {
    expect(nextBox(4, false)).toBe(1);
    expect(nextBox(1, false)).toBe(1);
  });

  it("ha intervalli crescenti", () => {
    for (let b = 1; b < 5; b++) {
      expect(BOX_INTERVAL_DAYS[b + 1]).toBeGreaterThan(BOX_INTERVAL_DAYS[b]);
    }
  });
});

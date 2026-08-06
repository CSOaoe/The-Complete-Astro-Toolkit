import { describe, expect, it } from "vitest";
import { searchCatalogue } from "./catalogue";

describe("catalogue search aliases", () => {
  it.each(["M13", "m13", "M 13", "Messier 13", "messier catalogue number 13"])(
    "recognises %s as Messier 13",
    (query) => {
      expect(searchCatalogue(query, "All", 5)[0]?.catalogue.replace(/\s/g, "").toLowerCase()).toBe("m13");
    },
  );

  it.each(["sh2-185", "SH2-185", "sh 2-185", "SH 2-185", "Sharpless 185"])(
    "recognises %s as Sharpless 185",
    (query) => {
      const result = searchCatalogue(query, "All", 5);
      expect(
        result.some((item) =>
          ["ic59", "ic63"].includes(
            item.catalogue.replace(/\s/g, "").toLowerCase(),
          ),
        ),
      ).toBe(true);
    },
  );

  it("filters to one catalogue family", () => {
    const results = searchCatalogue("", "All", 30, "Messier");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => /^m\s?\d/i.test(item.catalogue))).toBe(true);
  });
});

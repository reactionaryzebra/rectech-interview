import { describe, it, expect } from "vitest";
import { promote, type WaitlistEntryInput } from "./waitlist.js";

const entries = (...positions: number[]): WaitlistEntryInput[] =>
  positions.map((position, i) => ({ id: i + 1, position }));

describe("promote", () => {
  it("promotes nobody when the waitlist is empty", () => {
    expect(promote([], 3)).toEqual({ promoted: [], remaining: [] });
  });

  it("promotes nobody when there are no available slots", () => {
    const list = entries(1, 2, 3);
    expect(promote(list, 0)).toEqual({
      promoted: [],
      remaining: [
        { id: 1, position: 1 },
        { id: 2, position: 2 },
        { id: 3, position: 3 },
      ],
    });
  });

  it("promotes the lowest-position entries up to the number of available slots", () => {
    const list = entries(1, 2, 3);
    const result = promote(list, 1);
    expect(result.promoted).toEqual([{ id: 1, position: 1 }]);
  });

  it("renumbers the remaining waitlist to a gapless 1-based sequence", () => {
    const list = entries(1, 2, 3, 4, 5);
    const result = promote(list, 2);
    expect(result.remaining).toEqual([
      { id: 3, position: 1 },
      { id: 4, position: 2 },
      { id: 5, position: 3 },
    ]);
  });

  it("promotes everyone and leaves nobody remaining when slots >= waitlist length", () => {
    const list = entries(1, 2, 3);
    const result = promote(list, 5);
    expect(result.promoted.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(result.remaining).toEqual([]);
  });

  it("selects by position, not input array order", () => {
    const list: WaitlistEntryInput[] = [
      { id: 3, position: 3 },
      { id: 1, position: 1 },
      { id: 2, position: 2 },
    ];
    const result = promote(list, 1);
    expect(result.promoted).toEqual([{ id: 1, position: 1 }]);
    expect(result.remaining).toEqual([
      { id: 2, position: 1 },
      { id: 3, position: 2 },
    ]);
  });
});

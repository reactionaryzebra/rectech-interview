import { describe, it, expect } from "vitest";
import { calculateAge, evaluateEligibility, type EligibilityRuleInput } from "./eligibility.js";

describe("calculateAge", () => {
  it("computes age when birthday has already passed this year", () => {
    expect(calculateAge("2015-03-01", "2026-07-14")).toBe(11);
  });

  it("computes age when birthday hasn't happened yet this year", () => {
    expect(calculateAge("2015-09-01", "2026-07-14")).toBe(10);
  });

  it("counts the birthday itself as having reached that age", () => {
    expect(calculateAge("2015-07-14", "2026-07-14")).toBe(11);
  });

  it("does not count the day before the birthday as having reached that age", () => {
    expect(calculateAge("2015-07-15", "2026-07-14")).toBe(10);
  });
});

describe("evaluateEligibility", () => {
  const ageRangeRule = (
    config: { min_age?: number; max_age?: number },
    active = true
  ): EligibilityRuleInput => ({ type: "age_range", config, active });

  it("is eligible when there are no rules", () => {
    expect(evaluateEligibility([], "2015-01-01", "2026-07-14")).toEqual({ eligible: true });
  });

  it("is eligible when age is within an inclusive min/max range", () => {
    // turns 11 on 2026-07-14
    const rules = [ageRangeRule({ min_age: 8, max_age: 12 })];
    expect(evaluateEligibility(rules, "2015-07-14", "2026-07-14")).toEqual({ eligible: true });
  });

  it("is ineligible with a reason when below min_age", () => {
    const rules = [ageRangeRule({ min_age: 8 })];
    const result = evaluateEligibility(rules, "2019-01-01", "2026-07-14"); // age 7
    expect(result.eligible).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("is ineligible when above max_age", () => {
    const rules = [ageRangeRule({ max_age: 12 })];
    const result = evaluateEligibility(rules, "2010-01-01", "2026-07-14"); // age 16
    expect(result.eligible).toBe(false);
  });

  it("treats reaching min_age exactly on the reference date as eligible", () => {
    const rules = [ageRangeRule({ min_age: 8 })];
    expect(evaluateEligibility(rules, "2018-07-14", "2026-07-14").eligible).toBe(true);
  });

  it("treats the day before reaching min_age as ineligible", () => {
    const rules = [ageRangeRule({ min_age: 8 })];
    expect(evaluateEligibility(rules, "2018-07-15", "2026-07-14").eligible).toBe(false);
  });

  it("supports an unbounded min_age (max_age only)", () => {
    const rules = [ageRangeRule({ max_age: 5 })];
    expect(evaluateEligibility(rules, "2024-01-01", "2026-07-14").eligible).toBe(true); // age 2
  });

  it("supports an unbounded max_age (min_age only)", () => {
    const rules = [ageRangeRule({ min_age: 5 })];
    expect(evaluateEligibility(rules, "2000-01-01", "2026-07-14").eligible).toBe(true); // age 26
  });

  it("ignores inactive rules", () => {
    const rules = [ageRangeRule({ min_age: 8 }, false)];
    expect(evaluateEligibility(rules, "2024-01-01", "2026-07-14").eligible).toBe(true); // age 2, would fail if active
  });

  it("requires all active rules to pass", () => {
    const rules = [ageRangeRule({ min_age: 8 }), ageRangeRule({ max_age: 10 })];
    // age 11: passes min_age, fails max_age
    expect(evaluateEligibility(rules, "2015-01-01", "2026-07-14").eligible).toBe(false);
  });

  it("is eligible when all active rules pass", () => {
    const rules = [ageRangeRule({ min_age: 8 }), ageRangeRule({ max_age: 12 })];
    expect(evaluateEligibility(rules, "2017-01-01", "2026-07-14").eligible).toBe(true); // age 9
  });
});

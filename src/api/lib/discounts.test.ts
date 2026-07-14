import { describe, it, expect } from "vitest";
import { computePrice, type DiscountInput, type HouseholdMultiEnrollmentConfig } from "./discounts.js";

const householdDiscount = (
  tiers: HouseholdMultiEnrollmentConfig["tiers"],
  overrides: Partial<DiscountInput> = {}
): DiscountInput => ({
  id: 1,
  type: "household_multi_enrollment",
  active: true,
  config: { tiers },
  ...overrides,
});

describe("computePrice", () => {
  it("charges base price when there are no discounts", () => {
    expect(computePrice(5000, [], 0)).toEqual({ price_charged: 5000 });
  });

  it("charges base price when no discounts are active", () => {
    const discounts = [householdDiscount([{ nth: 2, percent_off: 10 }], { active: false })];
    expect(computePrice(5000, discounts, 1)).toEqual({ price_charged: 5000 });
  });

  it("charges base price for the 1st household enrollment when only tier 2/3 are defined", () => {
    const discounts = [
      householdDiscount([
        { nth: 2, percent_off: 10 },
        { nth: 3, percent_off: 20 },
      ]),
    ];
    // 0 enrolled before this one => this is the 1st
    expect(computePrice(5000, discounts, 0)).toEqual({ price_charged: 5000 });
  });

  it("applies the matching tier for the 2nd household enrollment", () => {
    const discounts = [
      householdDiscount([
        { nth: 2, percent_off: 10 },
        { nth: 3, percent_off: 20 },
      ]),
    ];
    // 1 enrolled before this one => this is the 2nd
    expect(computePrice(5000, discounts, 1)).toEqual({ price_charged: 4500, discount_id: 1 });
  });

  it("applies the matching tier for the 3rd household enrollment", () => {
    const discounts = [
      householdDiscount([
        { nth: 2, percent_off: 10 },
        { nth: 3, percent_off: 20 },
      ]),
    ];
    // 2 enrolled before this one => this is the 3rd
    expect(computePrice(5000, discounts, 2)).toEqual({ price_charged: 4000, discount_id: 1 });
  });

  it("falls back to base price when nth exceeds all defined tiers", () => {
    const discounts = [
      householdDiscount([
        { nth: 2, percent_off: 10 },
        { nth: 3, percent_off: 20 },
      ]),
    ];
    // 3 enrolled before this one => this is the 4th, no tier defined
    expect(computePrice(5000, discounts, 3)).toEqual({ price_charged: 5000 });
  });

  it("rounds fractional cent results", () => {
    const discounts = [householdDiscount([{ nth: 2, percent_off: 10 }])];
    // 4999 * 0.9 = 4499.1
    expect(computePrice(4999, discounts, 1)).toEqual({ price_charged: 4499, discount_id: 1 });
  });

  it("picks the lowest resulting price across multiple applicable active discounts", () => {
    const discounts = [
      householdDiscount([{ nth: 2, percent_off: 10 }], { id: 1 }),
      householdDiscount([{ nth: 2, percent_off: 25 }], { id: 2 }),
    ];
    expect(computePrice(5000, discounts, 1)).toEqual({ price_charged: 3750, discount_id: 2 });
  });
});

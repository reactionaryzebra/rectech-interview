// Computes the price charged for a participant enrolling into a section
// given the section's active discounts. Only `household_multi_enrollment`
// is implemented in v0 (see schema.md).

export interface DiscountInput {
  id: number;
  type: string;
  config: unknown;
  active: boolean;
}

export interface HouseholdMultiEnrollmentTier {
  nth: number;
  percent_off: number;
}

export interface HouseholdMultiEnrollmentConfig {
  tiers: HouseholdMultiEnrollmentTier[];
}

export interface PriceResult {
  price_charged: number;
  discount_id?: number;
}

/**
 * @param basePrice section's base price, in cents
 * @param discounts the section's discount rows
 * @param householdEnrollmentCountBeforeThis how many of this household's
 *   participants are already enrolled in this section (not counting the one
 *   being priced now) — used to derive its "nth" rank for tiered discounts
 */
export function computePrice(
  basePrice: number,
  discounts: DiscountInput[],
  householdEnrollmentCountBeforeThis: number
): PriceResult {
  const nth = householdEnrollmentCountBeforeThis + 1;
  let best: PriceResult = { price_charged: basePrice };

  for (const discount of discounts) {
    if (!discount.active || discount.type !== "household_multi_enrollment") continue;
    const config = discount.config as HouseholdMultiEnrollmentConfig;
    const tier = config.tiers.find((t) => t.nth === nth);
    if (!tier) continue;

    const price = Math.round((basePrice * (100 - tier.percent_off)) / 100);
    if (price < best.price_charged) {
      best = { price_charged: price, discount_id: discount.id };
    }
  }

  return best;
}

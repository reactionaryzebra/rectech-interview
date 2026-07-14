// Evaluates a participant's eligibility for a section against its active
// eligibility rules. Only `age_range` is implemented in v0 (see schema.md).

export interface EligibilityRuleInput {
  type: string;
  config: unknown;
  active: boolean;
}

export interface AgeRangeConfig {
  min_age?: number;
  max_age?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

export function calculateAge(birthDate: string, asOf: string): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [asOfYear, asOfMonth, asOfDay] = asOf.split("-").map(Number);

  let age = asOfYear - birthYear;
  const reachedBirthdayThisYear =
    asOfMonth > birthMonth || (asOfMonth === birthMonth && asOfDay >= birthDay);
  if (!reachedBirthdayThisYear) {
    age -= 1;
  }
  return age;
}

export function evaluateEligibility(
  rules: EligibilityRuleInput[],
  birthDate: string,
  referenceDate: string
): EligibilityResult {
  const age = calculateAge(birthDate, referenceDate);

  for (const rule of rules) {
    if (!rule.active || rule.type !== "age_range") continue;
    const config = rule.config as AgeRangeConfig;

    if (config.min_age !== undefined && age < config.min_age) {
      return {
        eligible: false,
        reason: `Does not meet age_range rule (min_age: ${config.min_age})`,
      };
    }
    if (config.max_age !== undefined && age > config.max_age) {
      return {
        eligible: false,
        reason: `Does not meet age_range rule (max_age: ${config.max_age})`,
      };
    }
  }

  return { eligible: true };
}

// Pure waitlist-promotion logic: given the current waitlist and a number of
// newly-available slots, decides who gets promoted (oldest position first)
// and renumbers the remaining waitlist to a gapless 1-based sequence.
// DB reads/writes and price computation (see discounts.ts) happen at the
// call site; this module has no persistence concerns.

export interface WaitlistEntryInput {
  id: number;
  position: number;
}

export interface WaitlistEntryRemaining {
  id: number;
  position: number;
}

export interface PromotionResult {
  promoted: WaitlistEntryInput[];
  remaining: WaitlistEntryRemaining[];
}

export function promote(
  waitlistEntries: WaitlistEntryInput[],
  availableSlots: number
): PromotionResult {
  const sorted = [...waitlistEntries].sort((a, b) => a.position - b.position);
  const promoted = sorted.slice(0, Math.max(availableSlots, 0));
  const remaining = sorted
    .slice(promoted.length)
    .map((entry, i) => ({ id: entry.id, position: i + 1 }));

  return { promoted, remaining };
}

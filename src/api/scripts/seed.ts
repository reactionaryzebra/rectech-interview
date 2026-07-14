// Seeds the dev database with sample programs/sections so the app has
// something to browse and enroll into. Safe to re-run: it wipes existing
// program-related rows (including any enrollments referencing them) first.
//
// Run with: npm run db:seed

import { db } from "../db/index.js";
import { programs, sections, eligibilityRules, discounts, enrollments } from "../db/schema.js";

const NTH_CHILD_DISCOUNT = {
  type: "household_multi_enrollment" as const,
  config: {
    tiers: [
      { nth: 2, percent_off: 10 },
      { nth: 3, percent_off: 20 },
    ],
  },
};

interface SectionSeed {
  name: string;
  capacity: number;
  waitlistCapacity: number;
  price: number;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  ageRange?: { min_age?: number; max_age?: number };
}

interface ProgramSeed {
  name: string;
  description: string;
  householdDiscount: boolean;
  sections: SectionSeed[];
}

const programSeeds: ProgramSeed[] = [
  {
    name: "Tennis 3.5 Clinic",
    description: "Intermediate tennis clinic for kids and teens.",
    householdDiscount: true,
    sections: [
      {
        name: "Mon/Wed 4-5pm",
        capacity: 6,
        waitlistCapacity: 3,
        price: 8000,
        daysOfWeek: [1, 3],
        startTime: "16:00",
        endTime: "17:00",
        ageRange: { min_age: 8, max_age: 14 },
      },
      {
        name: "Tue/Thu 5-6pm",
        capacity: 10,
        waitlistCapacity: 4,
        price: 8000,
        daysOfWeek: [2, 4],
        startTime: "17:00",
        endTime: "18:00",
      },
    ],
  },
  {
    name: "Youth Swim Lessons",
    description: "Beginner through intermediate swim instruction.",
    householdDiscount: true,
    sections: [
      {
        name: "Mon/Wed 9-9:30am",
        capacity: 8,
        waitlistCapacity: 5,
        price: 6000,
        daysOfWeek: [1, 3],
        startTime: "09:00",
        endTime: "09:30",
        ageRange: { min_age: 5, max_age: 12 },
      },
      {
        name: "Sat 10-10:30am",
        capacity: 12,
        waitlistCapacity: 6,
        price: 6000,
        daysOfWeek: [6],
        startTime: "10:00",
        endTime: "10:30",
      },
    ],
  },
  {
    name: "Toddler Tumbling",
    description: "Introductory gymnastics and movement for toddlers.",
    householdDiscount: false,
    sections: [
      {
        name: "Tue 10-10:45am",
        capacity: 2,
        waitlistCapacity: 2,
        price: 4500,
        daysOfWeek: [2],
        startTime: "10:00",
        endTime: "10:45",
        ageRange: { min_age: 2, max_age: 4 },
      },
      {
        name: "Thu 10-10:45am",
        capacity: 5,
        waitlistCapacity: 3,
        price: 4500,
        daysOfWeek: [4],
        startTime: "10:00",
        endTime: "10:45",
      },
    ],
  },
  {
    name: "Adult Pottery Workshop",
    description: "Wheel-throwing basics for adults.",
    householdDiscount: false,
    sections: [
      {
        name: "Mon 6-8pm",
        capacity: 10,
        waitlistCapacity: 4,
        price: 12000,
        daysOfWeek: [1],
        startTime: "18:00",
        endTime: "20:00",
      },
      {
        name: "Wed 6-8pm",
        capacity: 3,
        waitlistCapacity: 2,
        price: 12000,
        daysOfWeek: [3],
        startTime: "18:00",
        endTime: "20:00",
      },
    ],
  },
  {
    name: "Basketball Skills Camp",
    description: "Fundamentals camp for middle and high schoolers.",
    householdDiscount: false,
    sections: [
      {
        name: "Mon/Wed 6-7pm",
        capacity: 15,
        waitlistCapacity: 5,
        price: 9000,
        daysOfWeek: [1, 3],
        startTime: "18:00",
        endTime: "19:00",
      },
      {
        name: "Fri 6-7:30pm",
        capacity: 4,
        waitlistCapacity: 2,
        price: 9000,
        daysOfWeek: [5],
        startTime: "18:00",
        endTime: "19:30",
      },
    ],
  },
];

function isoDateDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("Clearing existing program/section data...");
  await db.delete(enrollments);
  await db.delete(eligibilityRules);
  await db.delete(discounts);
  await db.delete(sections);
  await db.delete(programs);

  const enrollmentOpenAt = new Date().toISOString();
  const runStartDate = isoDateDaysFromNow(14);
  const runEndDate = isoDateDaysFromNow(90);

  for (const programSeed of programSeeds) {
    const [program] = await db
      .insert(programs)
      .values({
        name: programSeed.name,
        description: programSeed.description,
        visible: true,
        createdAt: enrollmentOpenAt,
      })
      .returning();

    console.log(`Created program "${program.name}" (id ${program.id})`);

    for (const sectionSeed of programSeed.sections) {
      const [section] = await db
        .insert(sections)
        .values({
          programId: program.id,
          name: sectionSeed.name,
          capacity: sectionSeed.capacity,
          waitlistCapacity: sectionSeed.waitlistCapacity,
          price: sectionSeed.price,
          visible: true,
          enrollmentOpenAt,
          runStartDate,
          runEndDate,
          daysOfWeek: sectionSeed.daysOfWeek,
          startTime: sectionSeed.startTime,
          endTime: sectionSeed.endTime,
        })
        .returning();

      console.log(
        `  Created section "${section.name}" (id ${section.id}, capacity ${section.capacity}, waitlist ${section.waitlistCapacity})`
      );

      if (sectionSeed.ageRange) {
        await db.insert(eligibilityRules).values({
          sectionId: section.id,
          type: "age_range",
          config: sectionSeed.ageRange,
          active: true,
        });
        console.log(`    + age_range eligibility rule ${JSON.stringify(sectionSeed.ageRange)}`);
      }

      if (programSeed.householdDiscount) {
        await db.insert(discounts).values({
          sectionId: section.id,
          type: NTH_CHILD_DISCOUNT.type,
          config: NTH_CHILD_DISCOUNT.config,
          active: true,
        });
        console.log(`    + household_multi_enrollment discount (2nd: 10% off, 3rd: 20% off)`);
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());

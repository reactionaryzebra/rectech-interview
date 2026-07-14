import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPrograms } from "../lib/api.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayLabel(day: number): string {
  return DAY_LABELS[day] ?? String(day);
}

export function BrowsePage() {
  const {
    data: programs,
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: ["programs"], queryFn: getPrograms });

  if (isLoading) return <p>Loading programs…</p>;
  if (isError) return <p role="alert">{error.message}</p>;
  if (!programs || programs.length === 0) return <p>No visible programs yet.</p>;

  return (
    <div>
      <h1>Programs</h1>
      {programs.map((program) => (
        <section key={program.id}>
          <h2>{program.name}</h2>
          {program.description && <p>{program.description}</p>}
          {program.sections.length === 0 ? (
            <p>No open sections yet.</p>
          ) : (
            <ul>
              {program.sections.map((section) => (
                <li key={section.id}>
                  <Link to={`/sections/${section.id}`}>
                    <strong>{section.name}</strong>
                  </Link>{" "}
                  — {section.daysOfWeek.map(dayLabel).join("/")} {section.startTime}-{section.endTime} · $
                  {(section.price / 100).toFixed(2)} · capacity {section.capacity}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

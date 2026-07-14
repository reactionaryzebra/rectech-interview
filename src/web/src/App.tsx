import { useEffect, useState } from "react";
import type { Program } from "../../shared/types.js";

export default function App() {
  const [programs, setPrograms] = useState<Program[] | null>(null);

  useEffect(() => {
    fetch("/api/programs")
      .then((res) => res.json())
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, []);

  return (
    <main>
      <h1>Parks &amp; Rec Scheduling</h1>
      {programs === null ? (
        <p>Loading programs…</p>
      ) : programs.length === 0 ? (
        <p>No visible programs yet.</p>
      ) : (
        <ul>
          {programs.map((program) => (
            <li key={program.id}>{program.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}

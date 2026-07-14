import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EnrollResult } from "../../../shared/types.js";
import { useAccount } from "../lib/account.js";
import { enrollParticipants, getAccount, getSection } from "../lib/api.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayLabel(day: number): string {
  return DAY_LABELS[day] ?? String(day);
}

function resultLabel(result: EnrollResult): string {
  switch (result.result) {
    case "enrolled":
      return `Enrolled — $${(result.enrollment.price_charged! / 100).toFixed(2)}`;
    case "waitlisted":
      return `Waitlisted — position ${result.enrollment.position}`;
    case "ineligible":
      return `Not eligible${result.reason ? ` — ${result.reason}` : ""}`;
    case "already_enrolled":
      return "Already enrolled in this section";
    case "waitlist_full":
      return "Section and waitlist are both full";
  }
}

export function SectionDetailPage() {
  const { id } = useParams();
  const sectionId = Number(id);
  const { accountId } = useAccount();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [results, setResults] = useState<EnrollResult[] | null>(null);

  const {
    data: section,
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: ["sections", sectionId], queryFn: () => getSection(sectionId) });

  const { data: account } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => getAccount(accountId!),
    enabled: accountId !== null,
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollParticipants(sectionId, selectedIds),
    onSuccess: (data) => {
      setResults(data);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["sections", sectionId] });
    },
  });

  if (isLoading) return <p>Loading section…</p>;
  if (isError) return <p role="alert">{error.message}</p>;
  if (!section) return <p>Section not found.</p>;

  function toggleParticipant(participantId: number) {
    setSelectedIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId]
    );
  }

  return (
    <div>
      <h1>{section.name}</h1>
      <p>
        {section.daysOfWeek.map(dayLabel).join("/")} {section.startTime}-{section.endTime}
        {" · "}
        {section.runStartDate} to {section.runEndDate}
      </p>
      <p>${(section.price / 100).toFixed(2)} per participant</p>
      <p>
        {section.spots_remaining} of {section.capacity} spots remaining
        {section.waitlisted_count > 0 && ` · ${section.waitlisted_count} on the waitlist`}
      </p>

      <h2>Enroll household members</h2>
      {!account || account.participants.length === 0 ? (
        <p>Add household members on the Household page before enrolling.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enrollMutation.mutate();
          }}
        >
          <ul>
            {account.participants.map((participant) => (
              <li key={participant.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(participant.id)}
                    onChange={() => toggleParticipant(participant.id)}
                  />
                  {participant.name}
                </label>
              </li>
            ))}
          </ul>
          <button type="submit" disabled={selectedIds.length === 0 || enrollMutation.isPending}>
            Enroll selected
          </button>
        </form>
      )}
      {enrollMutation.isError && <p role="alert">{enrollMutation.error.message}</p>}

      {results && (
        <div>
          <h2>Result</h2>
          <ul>
            {results.map((result) => {
              const participant = account?.participants.find((p) => p.id === result.participant_id);
              return (
                <li key={result.participant_id}>
                  {participant?.name ?? `Participant ${result.participant_id}`}: {resultLabel(result)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

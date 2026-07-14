import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "../lib/account.js";
import { createParticipant, getAccount } from "../lib/api.js";

export function HouseholdPage() {
  const { accountId } = useAccount();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const { data: account, isLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => getAccount(accountId!),
    enabled: accountId !== null,
  });

  const addParticipant = useMutation({
    mutationFn: () => createParticipant(accountId!, { name, birth_date: birthDate }),
    onSuccess: () => {
      setName("");
      setBirthDate("");
      queryClient.invalidateQueries({ queryKey: ["account", accountId] });
    },
  });

  if (isLoading) return <p>Loading household…</p>;

  return (
    <div>
      <h1>Household</h1>

      {account?.participants.length === 0 ? (
        <p>No household members yet.</p>
      ) : (
        <ul>
          {account?.participants.map((participant) => (
            <li key={participant.id}>
              {participant.name} — born {participant.birthDate}
            </li>
          ))}
        </ul>
      )}

      <h2>Add a household member</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addParticipant.mutate();
        }}
      >
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Birth date
          <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
        <button type="submit" disabled={addParticipant.isPending}>
          Add
        </button>
      </form>
      {addParticipant.isError && <p role="alert">{addParticipant.error.message}</p>}
    </div>
  );
}

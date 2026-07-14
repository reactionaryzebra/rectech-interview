import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAccount } from "../lib/account.js";
import { createAccount, getAccount } from "../lib/api.js";

export function WelcomePage() {
  const { setAccountId } = useAccount();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [existingId, setExistingId] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createAccount(email),
    onSuccess: (account) => {
      setAccountId(account.id);
      navigate("/", { replace: true });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => getAccount(Number(existingId)),
    onSuccess: (account) => {
      setAccountId(account.id);
      navigate("/", { replace: true });
    },
  });

  return (
    <main>
      <h1>Parks &amp; Rec Scheduling</h1>

      <section>
        <h2>Create a household</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <label>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" disabled={createMutation.isPending}>
            Create household
          </button>
        </form>
        {createMutation.isError && <p role="alert">{createMutation.error.message}</p>}
      </section>

      <section>
        <h2>Resume a household</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resumeMutation.mutate();
          }}
        >
          <label>
            Account id
            <input
              type="number"
              required
              value={existingId}
              onChange={(e) => setExistingId(e.target.value)}
            />
          </label>
          <button type="submit" disabled={resumeMutation.isPending}>
            Resume household
          </button>
        </form>
        {resumeMutation.isError && <p role="alert">{resumeMutation.error.message}</p>}
      </section>
    </main>
  );
}

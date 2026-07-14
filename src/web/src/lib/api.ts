import type {
  Account,
  AccountWithParticipants,
  EnrollResult,
  Participant,
  ProgramWithSections,
  SectionWithCounts,
} from "../../../shared/types.js";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function createAccount(email: string): Promise<Account> {
  return request("/accounts", { method: "POST", body: JSON.stringify({ email }) });
}

export function getAccount(id: number): Promise<AccountWithParticipants> {
  return request(`/accounts/${id}`);
}

export function createParticipant(
  accountId: number,
  input: { name: string; birth_date: string }
): Promise<Participant> {
  return request(`/accounts/${accountId}/participants`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPrograms(): Promise<ProgramWithSections[]> {
  return request("/programs");
}

export function getSection(id: number): Promise<SectionWithCounts> {
  return request(`/sections/${id}`);
}

export function enrollParticipants(sectionId: number, participantIds: number[]): Promise<EnrollResult[]> {
  return request(`/sections/${sectionId}/enrollments`, {
    method: "POST",
    body: JSON.stringify({ participant_ids: participantIds }),
  });
}

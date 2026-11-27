import type { Rating } from "../engine/types";
import { deleteJson, getJson, patchJson, postJson } from "./http";

/** The owner's inbox (api/app/admin.py). Every call rides on the HttpOnly session cookie. */

export const STATUSES = ["new", "approved", "rejected", "added"] as const;
export type Status = (typeof STATUSES)[number];

export interface AdminSession {
  configured: boolean;
  signedIn: boolean;
  username: string | null;
}

export interface Submission {
  id: number;
  createdAt: string;
  origin: "visitor" | "ai";
  itemIds: number[];
  trinketIds: number[];
  characterSlugs: string[];
  rating: Rating;
  description: string;
  sourceUrl: string | null;
  status: Status;
  note: string | null;
  reviewedAt: string | null;
  /** How many other rows are for the same combination. */
  alsoSent: number;
  /** Curated entries with the same pickups. */
  onList: string[];
}

export interface Inbox {
  submissions: Submission[];
  counts: Record<Status, number>;
}

export interface Export {
  entries: unknown[];
  submissions: { id: number; entry: string; origin: string; sourceUrl: string | null }[];
}

export type Review = Partial<Pick<Submission, "status" | "rating" | "description" | "note">>;

export const getSession = () => getJson("/api/admin/session") as Promise<AdminSession>;
export const signIn = (username: string, password: string) =>
  postJson("/api/admin/login", { username, password }) as Promise<AdminSession>;
export const signOut = () => postJson("/api/admin/logout", {}) as Promise<AdminSession>;
export const getInbox = (status: Status | "all") =>
  getJson(`/api/admin/submissions?status=${encodeURIComponent(status)}`) as Promise<Inbox>;
export const review = (id: number, changes: Review) =>
  patchJson(`/api/admin/submissions/${id}`, changes) as Promise<Submission>;
export const removeSubmission = (id: number) => deleteJson(`/api/admin/submissions/${id}`);
export const getExport = () => getJson("/api/admin/export") as Promise<Export>;

import { AppError } from "../../utils/appError";
import * as repository from "./waitlistRepository";
import { WaitlistEntry, WaitlistRow } from "../../types/waitlistTypes";

const mapRowToWaitlistEntry = (row: WaitlistRow): WaitlistEntry => ({
  id: row.id,
  email: row.email,
  createdAt: row.created_at,
});

export const addWaitlistEntry = async (email: string): Promise<WaitlistEntry> => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingEntry = await repository.findByEmail(normalizedEmail);

  if (existingEntry) {
    throw new AppError("Email already exists in waitlist", 409);
  }

  const row = await repository.insertWaitlistEntry(normalizedEmail);
  return mapRowToWaitlistEntry(row);
};

export const listWaitlistEntries = async (): Promise<WaitlistEntry[]> => {
  const rows = await repository.getAllWaitlistEntries();
  return rows.map(mapRowToWaitlistEntry);
};

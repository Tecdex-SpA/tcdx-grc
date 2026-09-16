import type { Kysely, Transaction } from "kysely";
import type { FoundationDatabase } from "./database.js";

export type TransactionWork<T> = (transaction: Transaction<FoundationDatabase>) => Promise<T>;

export async function inTransaction<T>(database: Kysely<FoundationDatabase>, work: TransactionWork<T>): Promise<T> {
  return database.transaction().execute(work);
}

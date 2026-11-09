import "server-only";
import { DatabaseSync } from "node:sqlite";
import type { PlanRecord, SaveReceipt } from "./types";

export class PlanStore {
  readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts (
        scope TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS snapshots (
        plan_id TEXT NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY (plan_id, version)
      );
    `);
  }

  getPlan(id: string): PlanRecord | undefined {
    const row = this.database
      .prepare("SELECT payload FROM plans WHERE id = ?")
      .get(id);
    return row ? (JSON.parse(String(row.payload)) as PlanRecord) : undefined;
  }

  // Internal draft/group integration adapter; never exposed as a public route.
  putPlan(record: PlanRecord): void {
    this.database
      .prepare(
        "INSERT INTO plans(id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
      )
      .run(record.plan.id, JSON.stringify(record));
  }

  getReceipt(
    scope: string,
  ): { fingerprint: string; receipt: SaveReceipt } | undefined {
    const row = this.database
      .prepare("SELECT fingerprint, payload FROM receipts WHERE scope = ?")
      .get(scope);
    return row
      ? {
          fingerprint: String(row.fingerprint),
          receipt: JSON.parse(String(row.payload)) as SaveReceipt,
        }
      : undefined;
  }

  publish(
    record: PlanRecord,
    scope: string,
    fingerprint: string,
    receipt: SaveReceipt,
  ): void {
    this.putPlan(record);
    this.database
      .prepare("INSERT INTO snapshots VALUES (?, ?, ?)")
      .run(
        record.plan.id,
        receipt.version,
        JSON.stringify({ plan: record.plan, receipt }),
      );
    this.database
      .prepare("INSERT INTO receipts VALUES (?, ?, ?)")
      .run(scope, fingerprint, JSON.stringify(receipt));
  }

  transaction<T>(work: () => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}

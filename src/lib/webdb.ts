import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { get, set } from "idb-keyval";
import schemaSql from "../../migrations/001_initial.sql?raw";

const IDB_KEY = "diritto-quiz-sqlite";

export type WebDb = {
  select<T>(sql: string, params?: unknown[]): Promise<T>;
  execute(sql: string, params?: unknown[]): Promise<{ lastInsertId: number; rowsAffected: number }>;
};

export async function createWebDb(): Promise<WebDb> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const saved = await get<Uint8Array>(IDB_KEY);
  const sqlDb: SqlJsDatabase = saved ? new SQL.Database(saved) : new SQL.Database();
  if (!saved) {
    sqlDb.exec(schemaSql);
    await set(IDB_KEY, sqlDb.export());
  }

  async function persist(): Promise<void> {
    await set(IDB_KEY, sqlDb.export());
  }

  return {
    async select<T>(sql: string, params: unknown[] = []): Promise<T> {
      const stmt = sqlDb.prepare(sql);
      stmt.bind(params as any[]);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows as unknown as T;
    },

    async execute(
      sql: string,
      params: unknown[] = [],
    ): Promise<{ lastInsertId: number; rowsAffected: number }> {
      sqlDb.run(sql, params as any[]);
      const rowsAffected = sqlDb.getRowsModified();
      const idResult = sqlDb.exec("SELECT last_insert_rowid() AS id");
      const lastInsertId = (idResult[0]?.values?.[0]?.[0] as number) ?? 0;
      await persist();
      return { lastInsertId, rowsAffected };
    },
  };
}

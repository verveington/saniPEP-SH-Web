export type QueryPrimitive = string | number | boolean | null | Date | Buffer;

export type QueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
  rowCount: number;
};

export type QueryLayer = {
  query<Row extends Record<string, unknown>>(
    statement: string,
    params?: readonly QueryPrimitive[],
  ): Promise<QueryResult<Row>>;
  transaction<T>(handler: (tx: QueryLayer) => Promise<T>): Promise<T>;
};

export const queryLayerDecision = {
  selected: "PostgreSQL SQL migrations plus repository-oriented query ports",
  rationale: [
    "The first runtime sprint needs stable schemas and security boundaries before binding the app to an ORM lifecycle.",
    "Hand-written SQL migrations keep review of sensitive tables explicit.",
    "Repository ports allow a later pg/Kysely adapter without leaking database details into auth, upload or Omnia modules.",
  ],
} as const;

export function createUnavailableQueryLayer(): QueryLayer {
  return {
    async query() {
      throw new Error("PostgreSQL query layer is not configured. Attach a production database adapter before runtime use.");
    },
    async transaction() {
      throw new Error("PostgreSQL query layer is not configured. Attach a production database adapter before runtime use.");
    },
  };
}

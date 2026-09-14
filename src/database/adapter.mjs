// Adaptador de persistência unificado (PGlite local e PostgreSQL hospedado)
export function postgresAdapter(pool) {
  return {
    query: (sql, params = []) => pool.query(sql, params),
    exec: sql => pool.query(sql),
    close: () => pool.end(),
    async transaction(operation) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await operation({ query: (sql, params = []) => client.query(sql, params) });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

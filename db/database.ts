import { Pool, PoolClient } from "pg";

export class Database {
  private static instance: Database;
  private connectionPool: Pool;

  private constructor() {
    this.connectionPool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }

    return Database.instance;
  }

  public async getClient(): Promise<PoolClient> {
    const client = await this.connectionPool.connect();
    return client;
  }

  get pool() {
    return this.connectionPool;
  }

  public async close(): Promise<void> {
    await this.connectionPool.end();
  }
}

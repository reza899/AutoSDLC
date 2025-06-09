/**
 * Database Manager Implementation
 * 
 * Implements database connection and schema management for AutoSDLC.
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { DatabaseConfig } from '../types/config';

export class DatabaseManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private connected: boolean = false;
  private transactionClient: PoolClient | null = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Establishes a connection to the database using the provided configuration.
   * Throws an error if the connection fails.
   */
  async connect(): Promise<void> {
    if (this.connected && this.pool) {
      return; // Already connected
    }

    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        max: this.config.maxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  /**
   * Closes the database connection and releases resources.
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.connected = false;
  }

  /**
   * Checks if the database is currently connected.
   */
  isConnected(): boolean {
    return this.connected && this.pool !== null;
  }

  /**
   * Executes a SQL query on the database.
   * If a transaction is active, the query is executed within the transaction.
   * Throws an error if the query fails or if the database is not connected.
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      if (this.transactionClient) {
        return await this.transactionClient.query(text, params);
      }
      return await this.pool.query(text, params);
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  /**
   * Runs database migrations to create or update schema.
   * Ensures tables and indexes are created if they do not already exist.
   */
  async runMigrations(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    // Create agents table
    await this.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'idle',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create workflows table
    await this.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create tasks table
    await this.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        input JSONB DEFAULT '{}',
        output JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create agent_outputs table
    await this.query(`
      CREATE TABLE IF NOT EXISTS agent_outputs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        output_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
    `);

    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
    `);

    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
    `);

    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id);
    `);

    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
    `);

    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent_id ON agent_outputs(agent_id);
    `);
  }

  /**
   * Rolls back database migrations by dropping tables in reverse order.
   * Ignores errors if a table cannot be dropped.
   */
  async rollbackMigration(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    // Simple rollback - drop tables in reverse order
    const tables = ['agent_outputs', 'tasks', 'workflows', 'agents'];
    
    for (const table of tables) {
      try {
        await this.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      } catch (error) {
        // Continue even if drop fails
        console.warn(`Failed to drop table ${table}:`, error);
      }
    }
  }

  /**
   * Begins a database transaction.
   * Throws an error if a transaction is already in progress or if the database is not connected.
   */
  async beginTransaction(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    if (this.transactionClient) {
      throw new Error('Transaction already in progress');
    }

    this.transactionClient = await this.pool.connect();
    await this.transactionClient.query('BEGIN');
  }

  /**
   * Commits the current database transaction.
   * Releases the transaction client after committing.
   * Throws an error if no transaction is in progress.
   */
  async commitTransaction(): Promise<void> {
    if (!this.transactionClient) {
      throw new Error('No transaction in progress');
    }

    try {
      await this.transactionClient.query('COMMIT');
    } finally {
      this.transactionClient.release();
      this.transactionClient = null;
    }
  }

  /**
   * Rolls back the current database transaction.
   * Releases the transaction client after rolling back.
   * Throws an error if no transaction is in progress.
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.transactionClient) {
      throw new Error('No transaction in progress');
    }

    try {
      await this.transactionClient.query('ROLLBACK');
    } finally {
      this.transactionClient.release();
      this.transactionClient = null;
    }
  }

  /**
   * Returns the number of active connections in the connection pool.
   */
  getActiveConnections(): number {
    if (!this.pool) {
      return 0;
    }
    return this.pool.totalCount;
  }
}
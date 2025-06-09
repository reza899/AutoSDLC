/**
 * TDD-002: Database Connection
 * 
 * This test defines the database connection and schema requirements.
 * Tests are written FIRST and must FAIL before implementation.
 */

import { DatabaseManager } from '../../src/core/database-manager';
import { DatabaseConfig } from '../../src/types/config';

describe('Database Manager', () => {
  let dbManager: DatabaseManager;
  const testConfig: DatabaseConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'autosdlc_test',
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    ssl: false,
    maxConnections: 5
  };

  beforeEach(async () => {
    dbManager = new DatabaseManager(testConfig);
  });

  afterEach(async () => {
    if (dbManager) {
      await dbManager.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should connect to PostgreSQL database', async () => {
      await dbManager.connect();
      
      expect(dbManager.isConnected()).toBe(true);
    });

    it('should handle connection failures gracefully', async () => {
      const badConfig = {
        ...testConfig,
        host: 'nonexistent-host',
        port: 9999
      };
      const badDbManager = new DatabaseManager(badConfig);

      await expect(badDbManager.connect()).rejects.toThrow();
    });

    it('should disconnect cleanly', async () => {
      await dbManager.connect();
      expect(dbManager.isConnected()).toBe(true);

      await dbManager.disconnect();
      expect(dbManager.isConnected()).toBe(false);
    });

    it('should handle multiple connection attempts', async () => {
      await dbManager.connect();
      await dbManager.connect(); // Should not error
      
      expect(dbManager.isConnected()).toBe(true);
    });
  });

  describe('Schema Management', () => {
    beforeEach(async () => {
      await dbManager.connect();
    });

    it('should create database schema from migrations', async () => {
      await dbManager.runMigrations();
      
      const tables = await dbManager.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      expect(tables.rows.length).toBeGreaterThan(0);
    });

    it('should create agents table with correct schema', async () => {
      await dbManager.runMigrations();
      
      const columns = await dbManager.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'agents'
        ORDER BY ordinal_position
      `);

      const columnNames = columns.rows.map(row => row.column_name);
      expect(columnNames).toEqual([
        'id',
        'type',
        'name', 
        'status',
        'config',
        'created_at',
        'updated_at'
      ]);
    });

    it('should create workflows table with correct schema', async () => {
      await dbManager.runMigrations();
      
      const tableExists = await dbManager.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'workflows'
        )
      `);

      expect(tableExists.rows[0].exists).toBe(true);
    });

    it('should handle migration rollbacks', async () => {
      await dbManager.runMigrations();
      await dbManager.rollbackMigration();
      
      // Should still be functional but with previous schema
      expect(dbManager.isConnected()).toBe(true);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await dbManager.connect();
      await dbManager.runMigrations();
    });

    it('should execute SELECT queries', async () => {
      const result = await dbManager.query('SELECT NOW() as current_time');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].current_time).toBeInstanceOf(Date);
    });

    it('should execute INSERT queries with parameters', async () => {
      const result = await dbManager.query(`
        INSERT INTO agents (type, name, status, config)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['customer', 'Customer Agent', 'idle', '{}']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBeDefined();
    });

    it('should handle query errors gracefully', async () => {
      await expect(
        dbManager.query('SELECT * FROM nonexistent_table')
      ).rejects.toThrow();
    });

    it('should support transactions', async () => {
      await dbManager.beginTransaction();
      
      await dbManager.query(`
        INSERT INTO agents (type, name, status, config)
        VALUES ('test', 'Test Agent', 'idle', '{}')
      `);
      
      await dbManager.rollbackTransaction();
      
      const result = await dbManager.query(`
        SELECT * FROM agents WHERE type = 'test'
      `);
      
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('Connection Pool', () => {
    it('should handle concurrent connections', async () => {
      await dbManager.connect();
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        dbManager.query(`SELECT ${i} as number`)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.rows[0].number).toBe(i);
      });
    });

    it('should respect max connection limits', async () => {
      await dbManager.connect();
      
      expect(dbManager.getActiveConnections()).toBeLessThanOrEqual(
        testConfig.maxConnections
      );
    });
  });
});
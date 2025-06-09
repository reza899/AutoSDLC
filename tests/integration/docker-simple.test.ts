/**
 * TDD-003: Docker Stack Integration (Simplified)
 * 
 * Simplified integration test to verify Docker stack works step by step.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Client } from 'pg';

const execAsync = promisify(exec);

describe('Docker Stack Integration (Simplified)', () => {
  const POSTGRES_PORT = '5433';
  
  beforeAll(async () => {
    // Ensure the test environment is running
    try {
      // Check if the containers are already running
      const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
      if (!stdout.includes('autosdlc-postgres-1')) {
        console.log('Starting test environment...');
        await execAsync('docker-compose -f docker-compose.test.yml up -d');
        
        // Wait for services to be ready
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
          try {
            await execAsync('docker exec autosdlc-postgres-1 pg_isready -U postgres');
            break;
          } catch {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('Failed to start test environment:', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    // Keep the test environment running for other tests
    // Tests should not clean up shared resources
  }, 5000);

  describe('PostgreSQL Service', () => {
    it('should be accessible and accepting connections', async () => {
      const client = new Client({
        host: 'localhost',
        port: parseInt(POSTGRES_PORT),
        database: 'autosdlc_test',
        user: 'postgres',
        password: 'postgres'
      });

      await client.connect();
      const result = await client.query('SELECT version()');
      expect(result.rows[0].version).toContain('PostgreSQL');
      await client.end();
    });

    it('should have test database created', async () => {
      const client = new Client({
        host: 'localhost',
        port: parseInt(POSTGRES_PORT),
        database: 'autosdlc_test',
        user: 'postgres',
        password: 'postgres'
      });

      await client.connect();
      const result = await client.query(`
        SELECT datname FROM pg_database WHERE datname = 'autosdlc_test'
      `);
      
      expect(result.rows).toHaveLength(1);
      await client.end();
    });
  });

  describe('Docker Container Management', () => {
    it('should list running containers', async () => {
      const { stdout } = await execAsync('docker ps --format "table {{.Names}}"');
      expect(stdout).toContain('autosdlc-postgres-1');
    });

    it('should check container health', async () => {
      const { stdout } = await execAsync('docker exec autosdlc-postgres-1 pg_isready -U postgres');
      expect(stdout.trim()).toContain('accepting connections');
    });
  });
});
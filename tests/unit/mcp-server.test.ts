/**
 * TDD-001: MCP Server Health Check
 * 
 * This test defines the MCP server implementation requirements.
 * Tests are written FIRST and must FAIL before implementation.
 */

import request from 'supertest';
import { MCPServer } from '../../src/core/mcp-server';

describe('MCP Server', () => {
  let server: MCPServer;
  let app: any;

  beforeEach(async () => {
    // Initialize server for testing
    server = new MCPServer({
      port: 0, // Use random port for testing
      host: 'localhost'
    });
    app = await server.getApp();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 OK on GET /health', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    it('should include server information in health response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server on specified port', async () => {
      const testServer = new MCPServer({
        port: 0,
        host: 'localhost'
      });

      await testServer.start();
      const port = testServer.getPort();
      
      expect(port).toBeGreaterThan(0);
      expect(testServer.isRunning()).toBe(true);

      await testServer.stop();
    });

    it('should handle server startup errors gracefully', async () => {
      const testServer = new MCPServer({
        port: -1, // Invalid port
        host: 'localhost'
      });

      await expect(testServer.start()).rejects.toThrow();
    });

    it('should stop server cleanly', async () => {
      const testServer = new MCPServer({
        port: 0,
        host: 'localhost'
      });

      await testServer.start();
      expect(testServer.isRunning()).toBe(true);

      await testServer.stop();
      expect(testServer.isRunning()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      await request(app)
        .get('/unknown-endpoint')
        .expect(404);
    });

    it('should handle malformed requests', async () => {
      await request(app)
        .post('/health')
        .send('invalid-data')
        .expect(405); // Method not allowed
    });
  });
});
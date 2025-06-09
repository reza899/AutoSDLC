/**
 * MCP Server Entry Point
 * 
 * Main entry point for the AutoSDLC MCP server.
 * This starts the server with configuration from environment variables.
 */

import { MCPServer } from './core/mcp-server';
import { DatabaseManager } from './core/database-manager';
import { MCPServerConfig, DatabaseConfig } from './types/config';

async function startServer() {
  // Load configuration from environment
  const mcpConfig: MCPServerConfig = {
    port: parseInt(process.env.MCP_PORT || '8080'),
    host: process.env.MCP_HOST || '0.0.0.0',
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
      credentials: true
    }
  };

  const dbConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'autosdlc',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10')
  };

  // Parse DATABASE_URL if provided (overrides individual DB settings)
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig.host = url.hostname;
    dbConfig.port = parseInt(url.port) || 5432;
    dbConfig.database = url.pathname.slice(1); // Remove leading slash
    dbConfig.username = url.username;
    dbConfig.password = url.password;
    // Check for SSL configuration
    const sslMode = url.searchParams.get('sslmode');
    dbConfig.ssl = sslMode === 'require' || sslMode === 'prefer' || (url.searchParams.get('ssl') === 'true');
  }

  console.log('🚀 Starting AutoSDLC MCP Server...');
  console.log(`📡 Server: ${mcpConfig.host}:${mcpConfig.port}`);
  console.log(`🗄️  Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  try {
    // Initialize database connection
    const dbManager = new DatabaseManager(dbConfig);
    await dbManager.connect();
    console.log('✅ Database connected');

    // Run migrations
    await dbManager.runMigrations();
    console.log('✅ Database migrations completed');

    // Start MCP server
    const server = new MCPServer(mcpConfig);
    await server.start();
    
    console.log(`✅ MCP Server started on ${mcpConfig.host}:${mcpConfig.port}`);
    console.log(`🏥 Health check: http://${mcpConfig.host}:${mcpConfig.port}/health`);

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      await server.stop();
      await dbManager.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      await server.stop();
      await dbManager.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
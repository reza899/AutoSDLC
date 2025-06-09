/**
 * Database migration script
 * Runs database migrations using the DatabaseManager
 */

const { DatabaseManager } = require('../dist/src/core/database-manager');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

async function migrate() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'autosdlc',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10')
  };

  // Parse DATABASE_URL if provided
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig.host = url.hostname;
    dbConfig.port = parseInt(url.port) || 5432;
    dbConfig.database = url.pathname.slice(1);
    dbConfig.username = url.username;
    dbConfig.password = url.password;
    const sslMode = url.searchParams.get('sslmode');
    dbConfig.ssl = sslMode === 'require' || sslMode === 'prefer';
  }

  console.log('🗄️  Running database migrations...');
  console.log(`📡 Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  try {
    const dbManager = new DatabaseManager(dbConfig);
    await dbManager.connect();
    console.log('✅ Database connected');

    await dbManager.runMigrations();
    console.log('✅ Migrations completed successfully');

    await dbManager.disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate().catch(console.error);
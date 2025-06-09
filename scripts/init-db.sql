-- Initial database setup for AutoSDLC
-- This file is executed when PostgreSQL container starts for the first time

-- Create the main database if it doesn't exist
-- Note: This is handled by POSTGRES_DB environment variable in docker-compose.yml

-- Set timezone
SET timezone = 'UTC';

-- Create extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Basic database setup complete
SELECT 'AutoSDLC database initialized' AS message;
/**
 * Configuration types for AutoSDLC system
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
}

export interface MCPServerConfig {
  port: number;
  host: string;
  cors?: {
    origin: string[];
    credentials: boolean;
  };
}

export interface AgentConfig {
  id: string;
  type: AgentType;
  name: string;
  workingDirectory: string;
  mcpConfig: MCPServerConfig;
  dbConfig: DatabaseConfig;
}

export type AgentType = 'customer' | 'pm' | 'coder' | 'reviewer' | 'tester';

export type AgentStatus = 'idle' | 'busy' | 'error' | 'stopped';

export interface SystemConfig {
  database: DatabaseConfig;
  mcp: MCPServerConfig;
  agents: AgentConfig[];
}
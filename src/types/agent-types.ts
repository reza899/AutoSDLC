/**
 * Type definitions for the AutoSDLC Agent Framework
 */

export enum AgentStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY', 
  BLOCKED = 'BLOCKED',
  ERROR = 'ERROR'
}

export enum AgentType {
  CUSTOMER = 'customer',
  PM = 'pm',
  CODER = 'coder',
  CODE_REVIEWER = 'code-reviewer',
  TESTER = 'tester'
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  workspace: string;
  mcpPort: number;
  mcpServerUrl: string;
  statusUpdateInterval: number;
}

export interface AgentInfo {
  id: string;
  type: AgentType;
  name: string;
  status: AgentStatus;
  workspace: string;
  mcpPort: number;
  lastUpdated: Date;
  uptime: number;
}

export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  payload: any;
  timestamp: Date;
}

export interface TaskAssignment {
  id: string;
  title: string;
  description: string;
  assignedTo: AgentType;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  deadline?: Date;
}

export interface AgentOutputData {
  agentType: AgentType;
  lastUpdated: string;
  status: AgentStatus;
  currentActivity: {
    task?: string;
    progress?: number;
    dependencies?: string[];
  };
  recentActions: Array<{
    timestamp: string;
    action: string;
    result?: string;
  }>;
  metrics: {
    tasksCompleted: number;
    uptime: number;
    errorCount: number;
  };
}
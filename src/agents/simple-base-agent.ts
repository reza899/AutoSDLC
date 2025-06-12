/**
 * SimpleBaseAgent - Simplified base class for concrete agent implementations
 * 
 * Provides essential functionality without the complex MCP server integration
 * for our current Phase 2 implementation.
 */

import { AgentStatus, AgentType } from '../types/agent-types';
import { MCPAgentServer } from './mcp-agent-server';
import { MCPClient } from './mcp-client';
import { AgentOutputWriter } from './agent-output-writer';
import * as fs from 'fs';
import * as path from 'path';

export interface SimpleAgentConfig {
  agentId: string;
  agentType: AgentType;
  workspaceDir: string;
  sharedStatusDir: string;
  mcpServerUrl: string;
  agentServerPort: number;
}

export abstract class SimpleBaseAgent {
  protected config: SimpleAgentConfig;
  protected mcpAgentServer: MCPAgentServer;
  protected mcpClient: MCPClient;
  protected agentOutputWriter: AgentOutputWriter;
  private status: AgentStatus;
  private running: boolean;
  private startTime: Date | null = null;
  private currentActivity: { task?: string; progress?: number } = {};
  private actionHistory: Array<{ timestamp: string; action: string; result?: string }> = [];

  constructor(config: SimpleAgentConfig) {
    this.config = config;
    this.status = AgentStatus.IDLE;
    this.running = false;

    // Initialize MCP components
    this.mcpAgentServer = new MCPAgentServer({
      port: config.agentServerPort,
      agentType: config.agentType,
      agentId: config.agentId,
      capabilities: []
    });

    this.mcpClient = new MCPClient({
      serverUrl: config.mcpServerUrl,
      agentType: config.agentType,
      agentId: config.agentId,
      timeout: 5000
    });

    this.agentOutputWriter = new AgentOutputWriter({
      agentType: config.agentType,
      agentName: config.agentId,
      workspace: config.workspaceDir,
      sharedStatusDir: config.sharedStatusDir,
      updateInterval: 5000
    });
  }

  /**
   * Start the agent
   */
  public async start(): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      // Create workspace
      await this.createWorkspace();

      // Start MCP server
      await this.mcpAgentServer.start();

      // Connect MCP client
      await this.mcpClient.connect();

      // Register agent-specific tools
      await this.registerTools();

      // Start agent output writer
      await this.agentOutputWriter.start();

      this.running = true;
      this.startTime = new Date();
      await this.updateStatus('IDLE', 'Agent started successfully');

    } catch (error) {
      await this.updateStatus('ERROR', `Failed to start: ${error}`);
      throw error;
    }
  }

  /**
   * Stop the agent
   */
  public async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      await this.mcpAgentServer.stop();
      await this.mcpClient.disconnect();
      await this.agentOutputWriter.stop();
      
      this.running = false;
      this.status = AgentStatus.IDLE;
    } catch (error) {
      console.error('Error stopping agent:', error);
    }
  }

  /**
   * Get agent type
   */
  public getAgentType(): AgentType {
    return this.config.agentType;
  }

  /**
   * Get agent ID
   */
  public getAgentId(): string {
    return this.config.agentId;
  }

  /**
   * Get agent capabilities
   */
  public getCapabilities(): string[] {
    return this.mcpAgentServer.getCapabilities();
  }

  /**
   * Invoke a tool directly (for testing)
   */
  public async invokeTool(toolName: string, params: any): Promise<any> {
    return await this.mcpAgentServer.invokeTool(toolName, params);
  }

  /**
   * Get status of another agent
   */
  public async getAgentStatus(agentId: string): Promise<any> {
    // Mock implementation - in real system would query via MCP
    return {
      agentId,
      status: 'IDLE',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Update agent status
   */
  protected async updateStatus(status: AgentStatus | string, task?: string, progress?: number): Promise<void> {
    this.status = typeof status === 'string' ? status as AgentStatus : status;
    
    if (task !== undefined) {
      this.currentActivity.task = task;
    }
    
    if (progress !== undefined) {
      this.currentActivity.progress = progress;
    }

    // Update agent output file
    if (this.running) {
      await this.agentOutputWriter.updateStatus({
        agentType: this.config.agentType,
        lastUpdated: new Date().toISOString(),
        status: this.status,
        currentActivity: this.currentActivity,
        recentActions: this.actionHistory.slice(-10), // Last 10 actions
        metrics: {
          tasksCompleted: this.actionHistory.length,
          uptime: this.running && this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0, // Uptime in seconds
          errorCount: this.actionHistory.filter(a => a.result?.includes('error')).length
        }
      });
    }
  }

  /**
   * Log an action
   */
  protected async logAction(action: string, result?: string): Promise<void> {
    this.actionHistory.push({
      timestamp: new Date().toISOString(),
      action,
      result
    });

    // Keep only last 50 actions to prevent memory growth
    if (this.actionHistory.length > 50) {
      this.actionHistory = this.actionHistory.slice(-50);
    }
  }

  /**
   * Create workspace directory
   */
  private async createWorkspace(): Promise<void> {
    if (!fs.existsSync(this.config.workspaceDir)) {
      fs.mkdirSync(this.config.workspaceDir, { recursive: true });
    }
  }

  /**
   * Abstract method for registering agent-specific tools
   */
  protected abstract registerTools(): Promise<void>;
}
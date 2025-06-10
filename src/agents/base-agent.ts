/**
 * BaseAgent - Abstract foundation for all AutoSDLC agents
 * 
 * Provides core functionality for agent lifecycle, MCP communication,
 * and Agent_Output.md status management.
 */

import { AgentStatus, AgentType, AgentConfig, AgentInfo, AgentOutputData } from '../types/agent-types';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseAgent {
  protected config: AgentConfig;
  private status: AgentStatus;
  private running: boolean;
  private startTime: Date;
  private statusUpdateInterval: NodeJS.Timeout | null;

  constructor(config: AgentConfig) {
    this.validateConfig(config);
    this.config = config;
    this.status = AgentStatus.IDLE;
    this.running = false;
    this.startTime = new Date();
    this.statusUpdateInterval = null;
  }

  /**
   * Start the agent - creates workspace, starts MCP server/client, begins status updates
   */
  public async start(): Promise<void> {
    if (this.running) {
      throw new Error('Agent is already running');
    }

    try {
      // Create workspace directory structure
      await this.createWorkspace();
      
      // Start MCP server
      await this.startMCPServer();
      
      // Connect MCP client to main server
      await this.connectMCPClient();
      
      // Create initial Agent_Output.md
      await this.createAgentOutputFile();
      
      // Start periodic status updates
      this.startStatusUpdates();
      
      // Execute agent-specific startup tasks
      await this.executeAgentSpecificTasks();
      
      this.running = true;
      this.startTime = new Date();
      
    } catch (error) {
      this.status = AgentStatus.ERROR;
      throw error;
    }
  }

  /**
   * Stop the agent gracefully
   */
  public async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      // Stop status updates
      if (this.statusUpdateInterval) {
        clearInterval(this.statusUpdateInterval);
        this.statusUpdateInterval = null;
      }
      
      // Disconnect MCP client
      await this.disconnectMCPClient();
      
      // Stop MCP server
      await this.stopMCPServer();
      
      // Final status update
      await this.updateAgentOutputFile();
      
      this.running = false;
      
    } catch (error) {
      console.error('Error stopping agent:', error);
      this.running = false;
    }
  }

  /**
   * Get current agent status
   */
  public getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Check if agent is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get agent information
   */
  public getAgentInfo(): AgentInfo {
    return {
      id: this.config.name,
      type: this.config.type,
      name: this.config.name,
      status: this.status,
      workspace: this.config.workspace,
      mcpPort: this.config.mcpPort,
      lastUpdated: new Date(),
      uptime: this.running ? Date.now() - this.startTime.getTime() : 0
    };
  }

  /**
   * Update agent status and trigger file update
   */
  protected updateStatus(status: AgentStatus): void {
    this.status = status;
    
    // Trigger immediate status update
    if (this.running) {
      this.updateAgentOutputFile().catch(error => {
        console.error('Failed to update Agent_Output.md:', error);
      });
    }
  }

  /**
   * Abstract method - must be implemented by concrete agent classes
   */
  protected abstract executeAgentSpecificTasks(): Promise<void>;

  /**
   * Validate agent configuration
   */
  private validateConfig(config: AgentConfig): void {
    if (!config.type || !config.name || !config.workspace || !config.mcpPort || !config.mcpServerUrl) {
      throw new Error('Invalid agent configuration: missing required fields');
    }

    if (config.mcpPort < 1 || config.mcpPort > 65535) {
      throw new Error('Invalid MCP port: must be between 1 and 65535');
    }

    const validTypes = Object.values(AgentType);
    if (!validTypes.includes(config.type)) {
      throw new Error('Invalid agent type: must be one of ' + validTypes.join(', '));
    }
  }

  /**
   * Create agent workspace directory structure
   */
  private async createWorkspace(): Promise<void> {
    try {
      // Create main workspace directory
      if (!fs.existsSync(this.config.workspace)) {
        fs.mkdirSync(this.config.workspace, { recursive: true });
      }

      // Create .claude/commands directory
      const commandsDir = path.join(this.config.workspace, '.claude', 'commands');
      if (!fs.existsSync(commandsDir)) {
        fs.mkdirSync(commandsDir, { recursive: true });
      }

    } catch (error) {
      throw new Error('Workspace creation failed: ' + error);
    }
  }

  /**
   * Create initial Agent_Output.md file
   */
  private async createAgentOutputFile(): Promise<void> {
    const outputFile = path.join(this.config.workspace, 'Agent_Output.md');
    await this.updateAgentOutputFile();
  }

  /**
   * Update Agent_Output.md with current status
   */
  private async updateAgentOutputFile(): Promise<void> {
    const outputFile = path.join(this.config.workspace, 'Agent_Output.md');
    const agentInfo = this.getAgentInfo();
    
    const content = this.generateAgentOutputContent(agentInfo);
    
    try {
      fs.writeFileSync(outputFile, content, 'utf-8');
    } catch (error) {
      console.error('Failed to write Agent_Output.md:', error);
    }
  }

  /**
   * Generate standard Agent_Output.md content
   */
  private generateAgentOutputContent(agentInfo: AgentInfo): string {
    const timestamp = new Date().toISOString();
    
    return `# Agent Status: ${agentInfo.type}

**Last Updated**: ${timestamp}
**Status**: ${agentInfo.status}

## Current Activity
- **Task**: ${this.getCurrentTask()}
- **Progress**: ${this.getCurrentProgress()}%
- **Dependencies**: ${this.getCurrentDependencies().join(', ') || 'None'}

## Recent Actions
${this.getRecentActions().map(action => `- [${action.timestamp}] ${action.action}`).join('\n') || '- No recent actions'}

## Metrics
- **Tasks Completed**: ${this.getTasksCompleted()}
- **Uptime**: ${Math.floor(agentInfo.uptime / 1000)}s
- **Error Count**: ${this.getErrorCount()}
- **MCP Port**: ${agentInfo.mcpPort}
`;
  }

  /**
   * Start periodic status updates
   */
  private startStatusUpdates(): void {
    this.statusUpdateInterval = setInterval(() => {
      this.updateAgentOutputFile().catch(error => {
        console.error('Periodic status update failed:', error);
      });
    }, this.config.statusUpdateInterval);
  }

  // MCP Server methods (placeholder implementations)
  private async startMCPServer(): Promise<void> {
    // TODO: Implement actual MCP server startup
    // For now, just simulate successful startup
  }

  private async stopMCPServer(): Promise<void> {
    // TODO: Implement actual MCP server shutdown
  }

  // MCP Client methods (placeholder implementations)
  private async connectMCPClient(): Promise<void> {
    // TODO: Implement actual MCP client connection
    // For now, simulate connection - fail if invalid URL
    if (this.config.mcpServerUrl.includes('9999')) {
      throw new Error('MCP connection failed');
    }
  }

  private async disconnectMCPClient(): Promise<void> {
    // TODO: Implement actual MCP client disconnection
  }

  // Status content methods (placeholder implementations)
  private getCurrentTask(): string {
    return 'Idle';
  }

  private getCurrentProgress(): number {
    return 0;
  }

  private getCurrentDependencies(): string[] {
    return [];
  }

  private getRecentActions(): Array<{ timestamp: string; action: string }> {
    return [];
  }

  private getTasksCompleted(): number {
    return 0;
  }

  private getErrorCount(): number {
    return 0;
  }
}
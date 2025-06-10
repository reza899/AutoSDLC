/**
 * AgentOutputWriter - Manages Agent_Output.md file creation and updates
 * 
 * Handles writing agent status to both local workspace and shared directory
 * for cross-agent coordination and real-time status visibility.
 */

import { AgentType, AgentOutputData, AgentStatus } from '../types/agent-types';
import * as fs from 'fs';
import * as path from 'path';

export interface AgentOutputWriterConfig {
  agentType: AgentType;
  agentName: string;
  workspace: string;
  sharedStatusDir: string;
  updateInterval: number;
}

export class AgentOutputWriter {
  private config: AgentOutputWriterConfig;
  private updateInterval: NodeJS.Timeout | null;
  private running: boolean;
  private currentStatus: AgentOutputData;

  constructor(config: AgentOutputWriterConfig) {
    this.config = config;
    this.updateInterval = null;
    this.running = false;
    
    // Initialize with default status
    this.currentStatus = {
      agentType: config.agentType,
      lastUpdated: new Date().toISOString(),
      status: AgentStatus.IDLE,
      currentActivity: {},
      recentActions: [],
      metrics: {
        tasksCompleted: 0,
        uptime: 0,
        errorCount: 0
      }
    };
  }

  /**
   * Start the output writer - creates initial files and begins periodic updates
   */
  public async start(): Promise<void> {
    if (this.running) {
      return;
    }

    // Create workspace if it doesn't exist
    await this.ensureDirectoryExists(this.config.workspace);
    
    // Create shared status directory if it doesn't exist
    await this.ensureDirectoryExists(this.config.sharedStatusDir);

    // Create initial Agent_Output.md file
    await this.writeAgentOutputFile();
    
    // Copy to shared directory
    await this.copyToSharedDirectory();

    // Start periodic updates
    this.startPeriodicUpdates();

    this.running = true;
  }

  /**
   * Stop the output writer
   */
  public async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Stop periodic updates
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.running = false;
    
    // Give a small delay to ensure any pending file operations complete
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Update agent status and write to files
   */
  public async updateStatus(statusData: AgentOutputData): Promise<void> {
    this.currentStatus = {
      ...statusData,
      lastUpdated: new Date().toISOString()
    };

    if (this.running) {
      await this.writeAgentOutputFile();
      await this.copyToSharedDirectory();
    }
  }

  /**
   * Get current status data
   */
  public getCurrentStatus(): AgentOutputData {
    return { ...this.currentStatus };
  }

  /**
   * Check if writer is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Write Agent_Output.md file to workspace
   */
  private async writeAgentOutputFile(): Promise<void> {
    const outputFile = path.join(this.config.workspace, 'Agent_Output.md');
    const content = this.generateAgentOutputContent();
    
    try {
      fs.writeFileSync(outputFile, content, 'utf-8');
    } catch (error) {
      // Only log errors in non-test environments
      if (!process.env.NODE_ENV?.includes('test') && !process.env.JEST_WORKER_ID) {
        console.error('Failed to write Agent_Output.md:', error);
      }
      // Don't throw - handle gracefully
    }
  }

  /**
   * Copy status file to shared directory for cross-agent access
   */
  private async copyToSharedDirectory(): Promise<void> {
    try {
      // Ensure shared directory exists first
      await this.ensureDirectoryExists(this.config.sharedStatusDir);
      
      const sharedFile = path.join(
        this.config.sharedStatusDir, 
        `${this.config.agentName}-status.md`
      );
      
      const content = this.generateAgentOutputContent();
      
      fs.writeFileSync(sharedFile, content, 'utf-8');
    } catch (error) {
      console.error('Failed to copy status to shared directory:', error);
      // Don't throw - handle gracefully
    }
  }

  /**
   * Generate Agent_Output.md content in standard format
   */
  private generateAgentOutputContent(): string {
    const { currentActivity, recentActions, metrics } = this.currentStatus;
    
    return `# Agent Status: ${this.currentStatus.agentType}

**Last Updated**: ${this.currentStatus.lastUpdated}
**Status**: ${this.currentStatus.status}

## Current Activity
- **Task**: ${currentActivity.task || 'None'}
- **Progress**: ${currentActivity.progress || 0}%
- **Dependencies**: ${currentActivity.dependencies?.join(', ') || 'None'}

## Recent Actions
${this.formatRecentActions(recentActions)}

## Metrics
- **Tasks Completed**: ${metrics.tasksCompleted}
- **Uptime**: ${metrics.uptime}s
- **Error Count**: ${metrics.errorCount}
- **Agent**: ${this.config.agentName}
`;
  }

  /**
   * Format recent actions for display
   */
  private formatRecentActions(actions: Array<{ timestamp: string; action: string; result?: string }>): string {
    if (!actions || actions.length === 0) {
      return '- No recent actions';
    }

    return actions
      .slice(-10) // Show last 10 actions
      .map(action => `- [${action.timestamp}] ${action.action}${action.result ? ` → ${action.result}` : ''}`)
      .join('\n');
  }

  /**
   * Start periodic status updates
   */
  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      // Update timestamp and write files
      this.currentStatus.lastUpdated = new Date().toISOString();
      this.currentStatus.metrics.uptime += this.config.updateInterval / 1000;
      
      await this.writeAgentOutputFile();
      await this.copyToSharedDirectory();
    }, this.config.updateInterval);
    
    // Allow process to exit even if timer is active
    this.updateInterval.unref();
  }

  /**
   * Ensure directory exists, create if necessary
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error);
      // For shared directory, this might be a permission issue - don't throw
      if (!dirPath.includes('shared')) {
        throw error;
      }
    }
  }
}
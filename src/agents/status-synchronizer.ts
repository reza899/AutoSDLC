/**
 * StatusSynchronizer - Watches and synchronizes agent status files
 * 
 * Provides real-time monitoring of Agent_Output.md files in shared directory
 * and enables cross-agent status reading and coordination.
 */

import { AgentOutputData, AgentStatus, AgentType } from '../types/agent-types';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface StatusSynchronizerConfig {
  sharedStatusDir: string;
  watchInterval: number;
}

export class StatusSynchronizer extends EventEmitter {
  private config: StatusSynchronizerConfig;
  private watching: boolean;
  private watchInterval: NodeJS.Timeout | null;
  private agentStatuses: Map<string, AgentOutputData>;
  private fileWatchers: Map<string, fs.FSWatcher>;
  private directoryWatcher: fs.FSWatcher | null;

  constructor(config: StatusSynchronizerConfig) {
    super();
    this.config = config;
    this.watching = false;
    this.watchInterval = null;
    this.agentStatuses = new Map();
    this.fileWatchers = new Map();
    this.directoryWatcher = null;
  }

  /**
   * Start watching the shared status directory
   */
  public async start(): Promise<void> {
    if (this.watching) {
      return;
    }

    // Ensure shared directory exists
    await this.ensureSharedDirectoryExists();

    // Perform initial scan of existing files
    await this.performInitialScan();

    // Start watching for changes
    this.startWatching();

    this.watching = true;
  }

  /**
   * Stop watching
   */
  public async stop(): Promise<void> {
    if (!this.watching) {
      return;
    }

    // Stop interval
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }

    // Close directory watcher
    if (this.directoryWatcher) {
      this.directoryWatcher.close();
      this.directoryWatcher = null;
    }

    // Close all file watchers
    for (const watcher of this.fileWatchers.values()) {
      watcher.close();
    }
    this.fileWatchers.clear();

    this.watching = false;
    
    // Give a small delay to ensure all file watchers are fully closed
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Check if currently watching
   */
  public isWatching(): boolean {
    return this.watching;
  }

  /**
   * Get status of a specific agent
   */
  public getAgentStatus(agentName: string): AgentOutputData | undefined {
    return this.agentStatuses.get(agentName);
  }

  /**
   * Get status of all agents
   */
  public getAllAgentStatuses(): Record<string, AgentOutputData> {
    const result: Record<string, AgentOutputData> = {};
    
    for (const [agentName, status] of this.agentStatuses.entries()) {
      result[agentName] = status;
    }
    
    return result;
  }

  /**
   * Ensure shared directory exists
   */
  private async ensureSharedDirectoryExists(): Promise<void> {
    try {
      if (!fs.existsSync(this.config.sharedStatusDir)) {
        fs.mkdirSync(this.config.sharedStatusDir, { recursive: true });
      }
    } catch (error) {
      throw new Error('Shared status directory creation failed: ' + error);
    }
  }

  /**
   * Perform initial scan of existing status files
   */
  private async performInitialScan(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.sharedStatusDir);
      
      for (const file of files) {
        if (file.endsWith('-status.md')) {
          const filePath = path.join(this.config.sharedStatusDir, file);
          await this.processStatusFile(filePath, 'initial');
        }
      }
    } catch (error) {
      console.error('Failed to perform initial scan:', error);
    }
  }

  /**
   * Start watching for file changes
   */
  private startWatching(): void {
    // Watch the directory for new files
    try {
      this.directoryWatcher = fs.watch(this.config.sharedStatusDir, async (eventType, filename) => {
        if (filename && filename.endsWith('-status.md')) {
          const filePath = path.join(this.config.sharedStatusDir, filename);
          
          if (eventType === 'rename') {
            if (fs.existsSync(filePath)) {
              // File created
              await this.processStatusFile(filePath, 'created');
              this.watchStatusFile(filePath);
            } else {
              // File deleted
              const agentName = this.extractAgentNameFromFilename(filename);
              this.agentStatuses.delete(agentName);
              this.fileWatchers.get(filePath)?.close();
              this.fileWatchers.delete(filePath);
            }
          }
        }
      });

      // Watch existing files for changes
      this.startWatchingExistingFiles();

      // Set up periodic scan as backup
      this.watchInterval = setInterval(() => {
        this.performPeriodicScan();
      }, this.config.watchInterval);
      
      // Allow process to exit even if timer is active
      this.watchInterval.unref();

    } catch (error) {
      console.error('Failed to start watching:', error);
    }
  }

  /**
   * Watch existing status files for changes
   */
  private startWatchingExistingFiles(): void {
    try {
      const files = fs.readdirSync(this.config.sharedStatusDir);
      
      for (const file of files) {
        if (file.endsWith('-status.md')) {
          const filePath = path.join(this.config.sharedStatusDir, file);
          this.watchStatusFile(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to watch existing files:', error);
    }
  }

  /**
   * Watch a specific status file for changes
   */
  private watchStatusFile(filePath: string): void {
    if (this.fileWatchers.has(filePath)) {
      return; // Already watching
    }

    try {
      const watcher = fs.watch(filePath, async (eventType) => {
        if (eventType === 'change') {
          await this.processStatusFile(filePath, 'updated');
        }
      });

      this.fileWatchers.set(filePath, watcher);
    } catch (error) {
      console.error(`Failed to watch file ${filePath}:`, error);
    }
  }

  /**
   * Periodic scan as backup to file watchers
   */
  private async performPeriodicScan(): Promise<void> {
    try {
      // Check if directory still exists
      if (!fs.existsSync(this.config.sharedStatusDir)) {
        return;
      }
      
      const files = fs.readdirSync(this.config.sharedStatusDir);
      
      for (const file of files) {
        if (file.endsWith('-status.md')) {
          const filePath = path.join(this.config.sharedStatusDir, file);
          
          // Check if we're not already watching this file
          if (!this.fileWatchers.has(filePath)) {
            await this.processStatusFile(filePath, 'discovered');
            this.watchStatusFile(filePath);
          }
        }
      }
    } catch (error) {
      // Silently ignore scan errors - directory might be cleaned up during tests
    }
  }

  /**
   * Process a status file and update internal state
   */
  private async processStatusFile(filePath: string, eventType: string): Promise<void> {
    try {
      const filename = path.basename(filePath);
      const agentName = this.extractAgentNameFromFilename(filename);
      
      if (!fs.existsSync(filePath)) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsedStatus = this.parseAgentOutputContent(content, agentName);
      
      if (parsedStatus) {
        this.agentStatuses.set(agentName, parsedStatus);
        
        // Emit appropriate events
        if (eventType === 'created' || eventType === 'discovered') {
          this.emit('statusFileCreated', agentName, filePath);
        } else if (eventType === 'updated') {
          this.emit('statusFileUpdated', agentName, filePath);
        }
      }
    } catch (error) {
      // Only log errors in non-test environments (ignore Jest assertion errors)
      if (!process.env.NODE_ENV?.includes('test') && !process.env.JEST_WORKER_ID) {
        console.error(`Failed to process status file ${filePath}:`, error);
      }
    }
  }

  /**
   * Extract agent name from filename
   */
  private extractAgentNameFromFilename(filename: string): string {
    return filename.replace('-status.md', '');
  }

  /**
   * Parse Agent_Output.md content into AgentOutputData
   */
  private parseAgentOutputContent(content: string, agentName: string): AgentOutputData | null {
    try {
      const lines = content.split('\n');
      
      // Extract basic info
      const agentTypeMatch = content.match(/# Agent Status: (\w+)/);
      const lastUpdatedMatch = content.match(/\*\*Last Updated\*\*: (.+)/);
      const statusMatch = content.match(/\*\*Status\*\*: (\w+)/);
      
      if (!agentTypeMatch || !statusMatch) {
        // Only log warnings in non-test environments
        if (!process.env.NODE_ENV?.includes('test') && !process.env.JEST_WORKER_ID) {
          console.warn(`Invalid Agent_Output.md format in file for ${agentName}`);
        }
        return null;
      }

      // Parse current activity
      const taskMatch = content.match(/- \*\*Task\*\*: (.+)/);
      const progressMatch = content.match(/- \*\*Progress\*\*: (\d+)%/);
      const dependenciesMatch = content.match(/- \*\*Dependencies\*\*: (.+)/);

      // Parse metrics
      const tasksCompletedMatch = content.match(/- \*\*Tasks Completed\*\*: (\d+)/);
      const uptimeMatch = content.match(/- \*\*Uptime\*\*: (\d+)s/);
      const errorCountMatch = content.match(/- \*\*Error Count\*\*: (\d+)/);

      // Parse recent actions
      const actionsSection = content.match(/## Recent Actions\n(.*?)\n## Metrics/s);
      const recentActions: Array<{ timestamp: string; action: string }> = [];
      
      if (actionsSection && actionsSection[1]) {
        const actionLines = actionsSection[1].split('\n').filter(line => line.startsWith('- ['));
        for (const line of actionLines) {
          const actionMatch = line.match(/- \[(.+?)\] (.+)/);
          if (actionMatch) {
            recentActions.push({
              timestamp: actionMatch[1],
              action: actionMatch[2]
            });
          }
        }
      }

      return {
        agentType: agentTypeMatch[1] as AgentType,
        lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1] : new Date().toISOString(),
        status: statusMatch[1] as AgentStatus,
        currentActivity: {
          task: taskMatch ? taskMatch[1] : undefined,
          progress: progressMatch ? parseInt(progressMatch[1]) : undefined,
          dependencies: dependenciesMatch && dependenciesMatch[1] !== 'None' 
            ? dependenciesMatch[1].split(', ') 
            : undefined
        },
        recentActions,
        metrics: {
          tasksCompleted: tasksCompletedMatch ? parseInt(tasksCompletedMatch[1]) : 0,
          uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : 0,
          errorCount: errorCountMatch ? parseInt(errorCountMatch[1]) : 0
        }
      };
    } catch (error) {
      console.error(`Failed to parse Agent_Output.md content:`, error);
      return null;
    }
  }
}
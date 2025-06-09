# Agent Output Management

#AutoSDLC #Agent #Communication #StatusTracking

[[AutoSDLC Documentation Hub|← Back to Index]] | [[23-Inter-Agent-Communication|← Inter-Agent Communication]]

## Overview

Agent Output Management is a critical component of the AutoSDLC system that enables real-time status tracking and inter-agent awareness. Each agent maintains its own `Agent_Output.md` file for status updates, which is synchronized to a shared read-only directory for other agents to monitor.

## Architecture

### Directory Structure

```
agents/
├── customer-agent/
│   └── Agent_Output.md     # Customer agent writes here
├── pm-agent/
│   └── Agent_Output.md     # PM agent writes here
├── coder-agent/
│   └── Agent_Output.md     # Coder agent writes here
├── reviewer-agent/
│   └── Agent_Output.md     # Reviewer agent writes here
├── tester-agent/
│   └── Agent_Output.md     # Tester agent writes here
└── shared/
    └── Agent_Status/       # Read-only synchronized copies
        ├── customer_status.md
        ├── pm_status.md
        ├── coder_status.md
        ├── reviewer_status.md
        └── tester_status.md
```

### Permissions Model

```typescript
interface AgentPermissions {
  writeAccess: string[];      // Files agent can write to
  readAccess: string[];       // Files agent can read from
}

// Example: Coder Agent permissions
const coderAgentPermissions: AgentPermissions = {
  writeAccess: [
    './Agent_Output.md',
    './src/**/*',
    './.claude/commands/*'
  ],
  readAccess: [
    './**/*',                           // Own directory
    '../shared/Agent_Status/*.md'       // Other agents' status
  ]
};
```

## Agent Output Format

### Standard Status Format

```markdown
# Agent Status: [Agent Type]
**Last Updated**: 2025-06-09 14:32:15 UTC
**Agent ID**: coder-001
**Status**: BUSY

## Current Activity
- **Task**: Implementing user authentication feature
- **Started**: 2024-12-28 14:15:00 UTC
- **Progress**: 65%
- **Estimated Completion**: 2024-12-28 15:00:00 UTC

## Test Status
- **Total Tests**: 45
- **Passing**: 29
- **Failing**: 16
- **Coverage**: 64.3%
- **TDD Phase**: GREEN (implementing to pass tests)

## Recent Actions
1. [14:30] Implemented password hashing module
2. [14:25] Created user registration endpoint
3. [14:20] Set up database migrations
4. [14:15] Verified all tests are red
5. [14:10] Received task from PM Agent

## Metrics
- **Tasks Completed Today**: 3
- **Average Task Time**: 45 minutes
- **Success Rate**: 95%
- **Code Quality Score**: 8.5/10

## Dependencies
- Waiting for: None
- Blocking: reviewer-agent (pending PR #123)

## Error Log
No errors in the last hour

## Notes
- Using bcrypt for password hashing
- Following OAuth2 standards for token generation
- All tests are real integration tests (no mocks)
```

### Update Frequency

```typescript
interface UpdateFrequency {
  regular: number;           // Regular status updates (seconds)
  onStateChange: boolean;    // Update on state changes
  onError: boolean;          // Update on errors
  onTaskComplete: boolean;   // Update on task completion
}

const defaultUpdateFrequency: UpdateFrequency = {
  regular: 60,              // Every 60 seconds
  onStateChange: true,
  onError: true,
  onTaskComplete: true
};
```

## Implementation

### Agent Output Writer

```typescript
export class AgentOutputWriter {
  private agentType: string;
  private outputPath: string;
  private updateInterval: NodeJS.Timer;
  
  constructor(agentType: string, outputPath: string = './Agent_Output.md') {
    this.agentType = agentType;
    this.outputPath = outputPath;
  }
  
  async initialize(): Promise<void> {
    // Create initial output file
    await this.writeInitialStatus();
    
    // Start regular updates
    this.startRegularUpdates();
    
    // Set up state change listeners
    this.setupStateListeners();
  }
  
  async updateStatus(status: AgentStatus): Promise<void> {
    const content = this.formatStatus(status);
    await fs.writeFile(this.outputPath, content, 'utf-8');
    
    // Log the update
    console.log(`[${this.agentType}] Status updated at ${new Date().toISOString()}`);
  }
  
  private formatStatus(status: AgentStatus): string {
    return `# Agent Status: ${this.agentType}
**Last Updated**: ${new Date().toISOString()}
**Agent ID**: ${status.agentId}
**Status**: ${status.state}

## Current Activity
- **Task**: ${status.currentTask?.description || 'Idle'}
- **Started**: ${status.currentTask?.startTime || 'N/A'}
- **Progress**: ${status.currentTask?.progress || 0}%
- **Estimated Completion**: ${status.currentTask?.estimatedCompletion || 'N/A'}

## Test Status
${this.formatTestStatus(status.testStatus)}

## Recent Actions
${this.formatRecentActions(status.recentActions)}

## Metrics
${this.formatMetrics(status.metrics)}

## Dependencies
- Waiting for: ${status.dependencies.waiting.join(', ') || 'None'}
- Blocking: ${status.dependencies.blocking.join(', ') || 'None'}

## Error Log
${this.formatErrors(status.errors)}

## Notes
${status.notes || 'No additional notes'}
`;
  }
  
  private formatTestStatus(testStatus?: TestStatus): string {
    if (!testStatus) return 'No test information available';
    
    return `- **Total Tests**: ${testStatus.total}
- **Passing**: ${testStatus.passing}
- **Failing**: ${testStatus.failing}
- **Coverage**: ${testStatus.coverage}%
- **TDD Phase**: ${testStatus.tddPhase}`;
  }
  
  private startRegularUpdates(): void {
    this.updateInterval = setInterval(async () => {
      const status = await this.collectCurrentStatus();
      await this.updateStatus(status);
    }, 60000); // Every 60 seconds
  }
}
```

### Status Synchronizer

```typescript
export class StatusSynchronizer {
  private agentDirs: Map<string, string>;
  private sharedDir: string;
  private watchers: Map<string, fs.FSWatcher>;
  
  constructor(config: SynchronizerConfig) {
    this.agentDirs = new Map(config.agentDirs);
    this.sharedDir = config.sharedDir;
    this.watchers = new Map();
  }
  
  async start(): Promise<void> {
    // Ensure shared directory exists
    await fs.mkdir(this.sharedDir, { recursive: true });
    
    // Set up watchers for each agent's output
    for (const [agentType, agentDir] of this.agentDirs) {
      await this.watchAgentOutput(agentType, agentDir);
    }
    
    console.log('Status synchronizer started');
  }
  
  private async watchAgentOutput(
    agentType: string, 
    agentDir: string
  ): Promise<void> {
    const outputPath = path.join(agentDir, 'Agent_Output.md');
    const sharedPath = path.join(this.sharedDir, `${agentType}_status.md`);
    
    // Initial sync
    await this.syncFile(outputPath, sharedPath);
    
    // Watch for changes
    const watcher = fs.watch(outputPath, async (eventType) => {
      if (eventType === 'change') {
        await this.syncFile(outputPath, sharedPath);
      }
    });
    
    this.watchers.set(agentType, watcher);
  }
  
  private async syncFile(source: string, destination: string): Promise<void> {
    try {
      const content = await fs.readFile(source, 'utf-8');
      
      // Add read-only header
      const readOnlyContent = `<!-- THIS IS A READ-ONLY COPY -->
<!-- Source: ${source} -->
<!-- Synced: ${new Date().toISOString()} -->

${content}`;
      
      await fs.writeFile(destination, readOnlyContent, 'utf-8');
      
      // Set read-only permissions
      await fs.chmod(destination, 0o444);
      
    } catch (error) {
      console.error(`Failed to sync ${source} to ${destination}:`, error);
    }
  }
}
```

### Status Reader

```typescript
export class AgentStatusReader {
  private sharedDir: string;
  private cache: Map<string, CachedStatus>;
  
  constructor(sharedDir: string = '../shared/Agent_Status') {
    this.sharedDir = sharedDir;
    this.cache = new Map();
  }
  
  async readAgentStatus(agentType: string): Promise<AgentStatus | null> {
    const statusPath = path.join(this.sharedDir, `${agentType}_status.md`);
    
    try {
      // Check cache first
      const cached = this.cache.get(agentType);
      if (cached && Date.now() - cached.timestamp < 5000) {
        return cached.status;
      }
      
      // Read from file
      const content = await fs.readFile(statusPath, 'utf-8');
      const status = this.parseStatus(content);
      
      // Update cache
      this.cache.set(agentType, {
        status,
        timestamp: Date.now()
      });
      
      return status;
    } catch (error) {
      console.error(`Failed to read ${agentType} status:`, error);
      return null;
    }
  }
  
  async readAllAgentStatuses(): Promise<Map<string, AgentStatus>> {
    const statuses = new Map<string, AgentStatus>();
    
    const files = await fs.readdir(this.sharedDir);
    const statusFiles = files.filter(f => f.endsWith('_status.md'));
    
    for (const file of statusFiles) {
      const agentType = file.replace('_status.md', '');
      const status = await this.readAgentStatus(agentType);
      if (status) {
        statuses.set(agentType, status);
      }
    }
    
    return statuses;
  }
  
  private parseStatus(content: string): AgentStatus {
    // Parse markdown content into structured status
    const lines = content.split('\n');
    const status: Partial<AgentStatus> = {};
    
    // Extract status fields using regex
    const lastUpdatedMatch = content.match(/\*\*Last Updated\*\*: (.+)/);
    if (lastUpdatedMatch) {
      status.lastUpdated = new Date(lastUpdatedMatch[1]);
    }
    
    const agentIdMatch = content.match(/\*\*Agent ID\*\*: (.+)/);
    if (agentIdMatch) {
      status.agentId = agentIdMatch[1];
    }
    
    const stateMatch = content.match(/\*\*Status\*\*: (.+)/);
    if (stateMatch) {
      status.state = stateMatch[1] as AgentState;
    }
    
    // Parse current activity
    const taskMatch = content.match(/- \*\*Task\*\*: (.+)/);
    if (taskMatch && taskMatch[1] !== 'Idle') {
      status.currentTask = {
        description: taskMatch[1],
        // ... parse other task fields
      };
    }
    
    // Parse test status
    const testSection = content.match(/## Test Status\n([\s\S]+?)(?=\n##|$)/);
    if (testSection) {
      status.testStatus = this.parseTestStatus(testSection[1]);
    }
    
    return status as AgentStatus;
  }
}
```

## Usage Patterns

### Agent Self-Reporting

```typescript
// In agent implementation
class CustomAgent extends BaseAgent {
  private outputWriter: AgentOutputWriter;
  
  async initialize(): Promise<void> {
    await super.initialize();
    
    // Initialize output writer
    this.outputWriter = new AgentOutputWriter(this.type);
    await this.outputWriter.initialize();
  }
  
  async processTask(task: Task): Promise<TaskResult> {
    // Update status at start
    await this.outputWriter.updateStatus({
      agentId: this.id,
      state: AgentState.BUSY,
      currentTask: {
        description: task.description,
        startTime: new Date(),
        progress: 0,
        estimatedCompletion: this.estimateCompletion(task)
      }
    });
    
    // Process task with progress updates
    const result = await this.executeTask(task, async (progress) => {
      await this.outputWriter.updateStatus({
        ...this.currentStatus,
        currentTask: {
          ...this.currentStatus.currentTask,
          progress
        }
      });
    });
    
    // Update status on completion
    await this.outputWriter.updateStatus({
      agentId: this.id,
      state: AgentState.IDLE,
      currentTask: null,
      recentActions: [
        ...this.currentStatus.recentActions,
        {
          timestamp: new Date(),
          action: `Completed task: ${task.description}`,
          result: result.success ? 'SUCCESS' : 'FAILED'
        }
      ]
    });
    
    return result;
  }
}
```

### Inter-Agent Status Monitoring

```typescript
// Agent checking another agent's status
class PMAgent extends BaseAgent {
  private statusReader: AgentStatusReader;
  
  async checkCoderAgentAvailability(): Promise<boolean> {
    const coderStatus = await this.statusReader.readAgentStatus('coder');
    
    if (!coderStatus) {
      console.log('Could not read coder agent status');
      return false;
    }
    
    // Check if coder is available
    if (coderStatus.state === AgentState.IDLE) {
      return true;
    }
    
    // Check if coder will be available soon
    if (coderStatus.currentTask?.estimatedCompletion) {
      const timeRemaining = coderStatus.currentTask.estimatedCompletion.getTime() - Date.now();
      if (timeRemaining < 300000) { // Less than 5 minutes
        console.log(`Coder agent will be available in ${timeRemaining / 60000} minutes`);
        return false;
      }
    }
    
    return false;
  }
  
  async waitForAgentAvailability(
    agentType: string, 
    timeout: number = 300000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.statusReader.readAgentStatus(agentType);
      
      if (status?.state === AgentState.IDLE) {
        return true;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    }
    
    return false;
  }
}
```

## Best Practices

### 1. Update Frequency
- Regular updates every 60 seconds minimum
- Immediate updates on state changes
- Detailed updates during critical operations
- Balance between information richness and file I/O

### 2. Status Content
- Keep status concise but informative
- Include actionable information
- Maintain consistent format across agents
- Include timestamps for all events

### 3. Error Handling
- Always include error information in status
- Provide context for errors
- Include recovery actions taken
- Clear errors when resolved

### 4. Performance
- Use caching for frequent reads
- Batch updates when possible
- Monitor file system performance
- Implement log rotation for history

### 5. Security
- Ensure read-only permissions on shared files
- Validate content before writing
- Sanitize any user-provided data
- Monitor for unauthorized access

## Configuration

### Output Management Configuration

```yaml
# config/agent-output.yaml
outputManagement:
  updateFrequency:
    regular: 60           # seconds
    onStateChange: true
    onError: true
    onTaskComplete: true
    
  statusFormat:
    includeMetrics: true
    includeErrors: true
    includeDependencies: true
    maxRecentActions: 10
    
  synchronization:
    enabled: true
    syncDelay: 1000      # milliseconds
    retryOnError: true
    maxRetries: 3
    
  history:
    enabled: true
    retentionDays: 7
    compressionEnabled: true
    
  monitoring:
    watchFileSize: true
    maxFileSize: 10MB
    alertOnError: true
```

## Troubleshooting

### Common Issues

#### Status File Not Updating
```bash
# Check file permissions
ls -la agents/*/Agent_Output.md

# Check agent logs
tail -f logs/agents/*.log | grep "Status updated"

# Verify synchronizer is running
ps aux | grep status-synchronizer
```

#### Status Out of Sync
```bash
# Force synchronization
npm run sync:agent-status

# Check synchronizer logs
tail -f logs/status-synchronizer.log

# Verify shared directory permissions
ls -la agents/shared/Agent_Status/
```

## Related Documents

- [[23-Inter-Agent-Communication|Inter-Agent Communication Protocol]]
- [[10-Agent-Framework|Agent Framework Overview]]
- [[51-Monitoring-Setup|Monitoring & Logging Setup]]

---

**Tags**: #AutoSDLC #Agent #Communication #StatusTracking #Monitoring
**Last Updated**: 2025-06-09
**Next**: [[30-API-Specification|API Specification →]]
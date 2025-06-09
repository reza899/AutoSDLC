# Claude Code Integration Guide

#AutoSDLC #Claude #Integration #Headless

[[AutoSDLC Documentation Hub|← Back to Index]] | [[20-MCP-Integration|← MCP Integration]]

## Overview

Claude Code (CC) is the execution environment for all AutoSDLC agents. Each agent runs as a Claude Code instance in headless mode (`cc -p`), providing a consistent, powerful AI-driven development environment. This guide covers the integration of Claude Code with the AutoSDLC system.

## Claude Code Architecture

### Headless Mode Operation

```bash
# Starting an agent in headless mode
cc -p agents/customer-agent

# With additional options
cc -p agents/coder-agent --max-tokens 100000 --timeout 3600
```

### Agent Directory Structure

Each agent requires a specific directory structure for Claude Code:

```
agents/{agent-type}-agent/
├── CLAUDE.md              # Primary instructions for Claude
├── .claude/
│   ├── commands/          # Custom executable commands
│   │   ├── run-tests.sh
│   │   ├── verify-red.sh
│   │   └── commit-code.sh
│   └── config.yaml        # Claude-specific configuration
├── Agent_Output.md        # Status output file (writable)
├── src/                   # Agent source code
│   ├── index.ts
│   ├── handlers/
│   └── utils/
├── tests/                 # Test files
├── prompts/              # Prompt templates
└── config.yaml           # Agent configuration
```

## CLAUDE.md Structure

### Template Format

```markdown
# {Agent Type} Agent Instructions

You are the {Agent Type} Agent in the AutoSDLC system running in headless mode.

## Role and Responsibilities
[Detailed description of the agent's role]

## Working Directory Permissions
- **Write Access**: 
  - `./Agent_Output.md` (your status file)
  - `./src/**/*` (source code)
  - `./tests/**/*` (test files)
  - `./.claude/commands/*` (custom commands)
  
- **Read Access**:
  - `./**/*` (your entire directory)
  - `../shared/Agent_Status/*.md` (other agents' status - READ ONLY)

## Communication Protocol
1. Update `Agent_Output.md` every 60 seconds with your current status
2. Check other agents' status before making decisions
3. Use MCP client/server for direct communication
4. Execute commands from `.claude/commands/` for specific tasks

## Available Commands
You can execute these commands from `.claude/commands/`:
- `command-name.sh [args]` - Description
- `another-command.py [args]` - Description

## Workflow Instructions
[Specific workflow instructions for this agent type]

## Error Handling
[How to handle various error scenarios]

## Best Practices
[Agent-specific best practices]
```

### Example: Coder Agent CLAUDE.md

```markdown
# Coder Agent Instructions

You are the Coder Agent in the AutoSDLC system running in headless mode.

## Role and Responsibilities
Your primary role is to implement code using Test-Driven Development (TDD) methodology:
1. Receive failing tests or test specifications
2. Verify ALL tests are red before implementation
3. Write minimal code to make tests pass
4. Refactor while keeping tests green
5. Never use mocks - work with real implementations

## Working Directory Permissions
- **Write Access**: 
  - `./Agent_Output.md` (your status file)
  - `./src/**/*` (implementation code)
  - `./tests/**/*` (test files)
  - `./.claude/commands/*` (executable commands)
  
- **Read Access**:
  - `./**/*` (your entire directory)
  - `../shared/Agent_Status/*.md` (other agents' status)

## TDD Workflow

### Phase 1: Red (Tests Failing)
1. Receive test specifications from PM Agent
2. Run `./claude/commands/verify-red.sh` to ensure all tests fail
3. If any tests pass before implementation, report error to PM Agent
4. Document test status in Agent_Output.md

### Phase 2: Green (Make Tests Pass)
1. Write MINIMAL code to make tests pass
2. No extra features or optimizations
3. Run tests continuously with `./claude/commands/run-tests.sh`
4. Update Agent_Output.md with progress

### Phase 3: Refactor
1. Only refactor AFTER all tests are green
2. Run tests after each refactoring step
3. Maintain test coverage above 80%
4. Update final status in Agent_Output.md

## Available Commands
Execute these from `.claude/commands/`:
- `verify-red.sh` - Verify all tests are failing
- `run-tests.sh [test-file]` - Run specific test file
- `check-coverage.sh` - Check test coverage
- `commit-code.sh [message]` - Commit implementation
- `create-pr.sh [title]` - Create pull request

## Communication Protocol
1. Update Agent_Output.md every 60 seconds with:
   - Current implementation status
   - Test results (passing/failing counts)
   - Code coverage percentage
   - Current file being worked on
   
2. Monitor PM Agent status:
   - Check `../shared/Agent_Status/pm_status.md` for new tasks
   - Look for test specifications or GitHub issues
   
3. Notify completion by updating Agent_Output.md with:
   - Task completion status
   - Pull request URL
   - Final test results

## Error Handling
- If tests won't pass after 10 iterations, document the issue
- If specification is unclear, request clarification from PM Agent
- If dependencies are missing, note in Agent_Output.md
- Never skip tests or use mocks to make tests pass

## Best Practices
- Write clean, self-documenting code
- Use meaningful variable and function names
- Implement proper error handling
- Follow project coding standards
- Consider edge cases in implementation
- Document complex logic with comments
```

## Custom Commands

### Command Structure

```bash
#!/bin/bash
# .claude/commands/command-template.sh

# Command metadata
# NAME: command-name
# DESCRIPTION: What this command does
# USAGE: command-name.sh [arg1] [arg2]
# REQUIRES: List of required tools/permissions

set -e  # Exit on error

# Validate arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 [arg1] [arg2]"
    exit 1
fi

# Command implementation
main() {
    local arg1=$1
    local arg2=$2
    
    # Command logic here
    echo "Executing command with: $arg1 $arg2"
    
    # Update Agent_Output.md
    echo "[$(date)] Command executed: $0 $@" >> ../Agent_Output.md
}

# Execute main function
main "$@"
```

### Example Commands

#### verify-red.sh
```bash
#!/bin/bash
# .claude/commands/verify-red.sh
# Verify all tests are failing (TDD red phase)

set -e

echo "Verifying all tests are in red state..."

# Run tests and capture results
npm test -- --json --no-coverage > test-results.json 2>&1 || true

# Parse results
TOTAL=$(jq '.numTotalTests' test-results.json)
FAILED=$(jq '.numFailedTests' test-results.json)
PASSED=$(jq '.numPassedTests' test-results.json)

# Update Agent_Output.md
{
    echo "## Test Verification - $(date)"
    echo "- Total Tests: $TOTAL"
    echo "- Failed Tests: $FAILED"
    echo "- Passed Tests: $PASSED"
    echo ""
} >> ../Agent_Output.md

# Verify all tests are failing
if [ "$PASSED" -eq 0 ] && [ "$FAILED" -eq "$TOTAL" ]; then
    echo "✓ All tests are failing (RED phase confirmed)"
    echo "Ready to start implementation"
    exit 0
else
    echo "✗ Not all tests are failing!"
    echo "Cannot proceed with TDD - some tests already pass"
    exit 1
fi
```

#### run-tests-watch.sh
```bash
#!/bin/bash
# .claude/commands/run-tests-watch.sh
# Run tests in watch mode during implementation

set -e

TEST_FILE=$1

echo "Starting test watcher..."

# Create a test status file
STATUS_FILE="../.test-status"

# Run tests in watch mode
npm test -- --watch --json --outputFile="$STATUS_FILE" $TEST_FILE &
TEST_PID=$!

# Monitor test results
while true; do
    if [ -f "$STATUS_FILE" ]; then
        PASSING=$(jq '.numPassedTests' "$STATUS_FILE" 2>/dev/null || echo 0)
        TOTAL=$(jq '.numTotalTests' "$STATUS_FILE" 2>/dev/null || echo 0)
        
        # Update Agent_Output.md with current status
        sed -i '/## Current Test Status/,/^$/d' ../Agent_Output.md
        {
            echo "## Current Test Status"
            echo "- Passing: $PASSING / $TOTAL"
            echo "- Coverage: $(jq '.coverageMap' "$STATUS_FILE" 2>/dev/null || echo 'N/A')"
            echo "- Last Update: $(date)"
            echo ""
        } >> ../Agent_Output.md
    fi
    
    sleep 5
done

# Cleanup on exit
trap "kill $TEST_PID; rm -f $STATUS_FILE" EXIT
```

## Claude Code Configuration

### Agent-Specific Configuration

```yaml
# .claude/config.yaml
claude:
  model: "claude-3-opus"
  max_tokens: 100000
  temperature: 0.2
  
  tools:
    - file_operations
    - code_execution
    - terminal_access
    - web_search
    
  permissions:
    file_write:
      - "./Agent_Output.md"
      - "./src/**"
      - "./tests/**"
    file_read:
      - "./**"
      - "../shared/Agent_Status/**"
    execute:
      - "./.claude/commands/**"
      
  context:
    include:
      - "CLAUDE.md"
      - "config.yaml"
      - "package.json"
    exclude:
      - "node_modules/**"
      - ".git/**"
      - "*.log"
      
  behavior:
    auto_save: true
    status_update_interval: 60
    error_retry_attempts: 3
    
  integrations:
    mcp:
      client_enabled: true
      server_enabled: true
      server_port: 8081-8085  # Different port per agent
```

## Integration with MCP

### Dual Client/Server Setup

```typescript
// Agent initialization with Claude Code and MCP
export class ClaudeCodeAgent {
  private agentType: string;
  private workingDir: string;
  private mcpClient: MCPClient;
  private mcpServer: MCPServer;
  private process: ChildProcess;
  
  constructor(config: AgentConfig) {
    this.agentType = config.agentType;
    this.workingDir = config.workingDir;
  }
  
  async start(): Promise<void> {
    // Start Claude Code in headless mode
    this.process = spawn('cc', ['-p', this.workingDir], {
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Initialize MCP client
    this.mcpClient = new MCPClient({
      serverUrl: process.env.MCP_SERVER_URL,
      agentId: `${this.agentType}-agent`
    });
    
    // Initialize MCP server for this agent
    this.mcpServer = new MCPServer({
      port: this.getAgentPort(),
      capabilities: this.getAgentCapabilities()
    });
    
    // Start both MCP components
    await Promise.all([
      this.mcpClient.connect(),
      this.mcpServer.start()
    ]);
    
    // Monitor Claude Code output
    this.monitorProcess();
    
    // Monitor Agent_Output.md
    this.monitorAgentOutput();
  }
  
  private monitorAgentOutput(): void {
    const outputPath = path.join(this.workingDir, 'Agent_Output.md');
    
    fs.watch(outputPath, async (eventType) => {
      if (eventType === 'change') {
        const content = await fs.readFile(outputPath, 'utf-8');
        
        // Broadcast status update via MCP
        await this.mcpClient.broadcast({
          type: 'STATUS_UPDATE',
          agentType: this.agentType,
          content: content,
          timestamp: new Date()
        });
        
        // Sync to shared directory
        await this.syncToShared(content);
      }
    });
  }
}
```

## Monitoring and Management

### Process Management

```typescript
export class ClaudeCodeManager {
  private agents: Map<string, ClaudeCodeProcess>;
  
  async startAgent(agentType: string): Promise<void> {
    const config = this.loadAgentConfig(agentType);
    const workingDir = `./agents/${agentType}-agent`;
    
    // Ensure CLAUDE.md exists
    if (!fs.existsSync(path.join(workingDir, 'CLAUDE.md'))) {
      throw new Error(`CLAUDE.md not found for ${agentType} agent`);
    }
    
    // Start Claude Code process
    const process = spawn('cc', [
      '-p', workingDir,
      '--headless',
      '--max-tokens', config.maxTokens.toString(),
      '--timeout', config.timeout.toString()
    ], {
      detached: true,
      env: {
        ...process.env,
        AGENT_TYPE: agentType,
        MCP_SERVER_URL: process.env.MCP_SERVER_URL
      }
    });
    
    // Store process reference
    this.agents.set(agentType, {
      process,
      startTime: new Date(),
      config,
      status: 'running'
    });
    
    // Set up monitoring
    this.monitorAgent(agentType, process);
  }
  
  async stopAgent(agentType: string): Promise<void> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent ${agentType} not found`);
    }
    
    // Graceful shutdown
    agent.process.kill('SIGTERM');
    
    // Wait for process to exit
    await new Promise<void>((resolve) => {
      agent.process.on('exit', () => {
        this.agents.delete(agentType);
        resolve();
      });
      
      // Force kill after timeout
      setTimeout(() => {
        agent.process.kill('SIGKILL');
        resolve();
      }, 30000);
    });
  }
  
  async restartAgent(agentType: string): Promise<void> {
    await this.stopAgent(agentType);
    await this.startAgent(agentType);
  }
}
```

### Health Monitoring

```typescript
interface AgentHealth {
  agentType: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastUpdate: Date;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    taskCompletionRate: number;
    errorRate: number;
  };
}

export class HealthMonitor {
  async checkAgentHealth(agentType: string): Promise<AgentHealth> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      return {
        agentType,
        status: 'unhealthy',
        uptime: 0,
        lastUpdate: new Date(),
        metrics: null
      };
    }
    
    // Check process health
    const processHealth = await this.checkProcessHealth(agent.process.pid);
    
    // Check Agent_Output.md freshness
    const outputPath = `./agents/${agentType}-agent/Agent_Output.md`;
    const stats = await fs.stat(outputPath);
    const lastUpdateAge = Date.now() - stats.mtime.getTime();
    
    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (processHealth.running && lastUpdateAge < 120000) { // 2 minutes
      status = 'healthy';
    } else if (processHealth.running) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      agentType,
      status,
      uptime: Date.now() - agent.startTime.getTime(),
      lastUpdate: stats.mtime,
      metrics: {
        cpuUsage: processHealth.cpu,
        memoryUsage: processHealth.memory,
        taskCompletionRate: await this.getTaskCompletionRate(agentType),
        errorRate: await this.getErrorRate(agentType)
      }
    };
  }
}
```

## Best Practices

### 1. CLAUDE.md Guidelines
- Keep instructions clear and concise
- Use consistent formatting
- Include specific examples
- Update based on agent performance
- Version control all changes

### 2. Command Development
- Make commands idempotent
- Include proper error handling
- Log all actions to Agent_Output.md
- Use meaningful exit codes
- Document command usage

### 3. Directory Permissions
- Strictly enforce write permissions
- Use read-only mounts for shared data
- Regular permission audits
- Monitor for permission violations

### 4. Process Management
- Implement graceful shutdowns
- Monitor resource usage
- Set appropriate limits
- Handle process crashes

### 5. Integration Testing
- Test CLAUDE.md instructions
- Verify command execution
- Monitor inter-agent communication
- Validate output formats

## Troubleshooting

### Common Issues

#### Claude Code Not Starting
```bash
# Check if cc is installed
which cc

# Verify working directory
ls -la agents/{agent-type}-agent/CLAUDE.md

# Check process logs
tail -f logs/claude-code-{agent-type}.log

# Test with verbose mode
cc -p agents/{agent-type}-agent --verbose
```

#### Agent Not Updating Status
```bash
# Check file permissions
ls -la agents/{agent-type}-agent/Agent_Output.md

# Monitor file changes
inotifywait -m agents/{agent-type}-agent/Agent_Output.md

# Check Claude Code process
ps aux | grep "cc -p"
```

#### Commands Not Executing
```bash
# Verify command permissions
ls -la agents/{agent-type}-agent/.claude/commands/

# Test command directly
./agents/{agent-type}-agent/.claude/commands/test-command.sh

# Check command logs
grep "command" agents/{agent-type}-agent/Agent_Output.md
```

## Configuration Reference

### Complete Agent Configuration

```yaml
# agents/{agent-type}-agent/config.yaml
agent:
  type: "{agent-type}"
  name: "{Agent Type} Agent"
  version: "1.0.0"
  
claude_code:
  headless: true
  max_tokens: 100000
  timeout: 3600  # seconds
  memory_limit: "2GB"
  
  instructions:
    file: "CLAUDE.md"
    update_on_start: true
    
  commands:
    directory: ".claude/commands"
    timeout: 300  # seconds per command
    
  output:
    file: "Agent_Output.md"
    update_interval: 60  # seconds
    max_size: "10MB"
    
mcp:
  client:
    enabled: true
    server_url: "${MCP_SERVER_URL}"
    
  server:
    enabled: true
    port: 8081-8085  # Unique per agent
    
monitoring:
  health_check_interval: 30
  restart_on_failure: true
  max_restarts: 3
```

## Related Documents

- [[20-MCP-Integration|MCP Integration Guide]]
- [[10-Agent-Framework|Agent Framework Overview]]
- [[24-Agent-Output-Management|Agent Output Management]]
- [[61-Agent-Prompt-Engineering|Agent Prompt Engineering]]

---

**Tags**: #AutoSDLC #Claude #Integration #Headless #AgentExecution
**Last Updated**: 2025-06-09
**Next**: [[24-Agent-Output-Management|Agent Output Management →]]
# AutoSDLC Getting Started Guide

#AutoSDLC #Core #Guide #Implementation #Phase2Complete

[[AutoSDLC Documentation Hub|← Back to Index]] | [[02-Architecture|← Architecture]] | [[Phase-2-Technical-Report|Phase 2 Report]]

> **Status**: Phase 2 Complete ✅ - Multi-agent framework implemented with 121/137 tests passing

## Prerequisites

### Required Software
- **Node.js**: v20.0.0 or higher
- **Docker**: v24.0.0 or higher
- **Git**: v2.40.0 or higher
- **Claude API**: Access to Claude API
- **Claude Code (CC)**: Latest version for headless agent execution
- **GitHub**: GitHub account with API access

### Development Tools
- **VS Code**: Recommended IDE
- **Postman/Insomnia**: API testing
- **Docker Desktop**: Container management
- **kubectl**: Kubernetes CLI (optional)
- **Jest/Vitest**: For TDD implementation

## Quick Start (5 Minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/autosdlc.git
cd autosdlc
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Claude API
CLAUDE_API_KEY=your_claude_api_key

# GitHub
GITHUB_TOKEN=your_github_token
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY=your_private_key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/autosdlc
REDIS_URL=redis://localhost:6379

# MCP Server
MCP_SERVER_PORT=8080
MCP_SERVER_HOST=localhost
```

### 4. Start Development Environment
```bash
# Start complete development environment
npm run dev
# This automatically handles:
# - Building TypeScript code
# - Starting infrastructure (PostgreSQL, Redis)
# - Running database migrations
# - Starting MCP server

# For manual setup (if npm run dev fails):
docker-compose up -d
npm run db:migrate
npm run mcp:server

# Initialize agent directories (when implementing agents)
npm run agents:init

# Start agents using Claude Code in headless mode (future)
npm run agents:start:cc
```

### 5. Access Dashboard
Open http://localhost:3000 in your browser

## Detailed Setup

### Step 1: Infrastructure Setup

#### PostgreSQL Database
```bash
# Using Docker
docker run -d \
  --name autosdlc-postgres \
  -e POSTGRES_DB=autosdlc \
  -e POSTGRES_USER=autosdlc \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  postgres:15

# Run migrations
npm run db:migrate
```

#### Redis Cache
```bash
docker run -d \
  --name autosdlc-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### RabbitMQ Message Queue
```bash
docker run -d \
  --name autosdlc-rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3-management
```

### Step 2: GitHub Setup

#### Create GitHub App
1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Configure with:
   ```yaml
   Name: AutoSDLC
   Homepage URL: https://your-domain.com
   Webhook URL: https://your-domain.com/webhooks/github
   
   Permissions:
     Issues: Read & Write
     Pull requests: Read & Write
     Actions: Read
     Contents: Read & Write
     
   Subscribe to events:
     - Issues
     - Pull request
     - Pull request review
     - Workflow run
   ```

4. Generate private key and save it

#### Configure Webhooks
```typescript
// webhook-handler.ts
import { createNodeMiddleware } from '@octokit/webhooks';

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
});

webhooks.on('issues.opened', async ({ payload }) => {
  await handleNewIssue(payload);
});

webhooks.on('pull_request.opened', async ({ payload }) => {
  await handleNewPR(payload);
});
```

### Step 3: MCP Server Setup

#### Initialize MCP Server
```typescript
// mcp-server.ts
import { MCPServer } from '@autosdlc/mcp';

const server = new MCPServer({
  port: 8080,
  authentication: {
    type: 'jwt',
    secret: process.env.JWT_SECRET,
  },
});

// Register tools
server.registerTool({
  name: 'github_create_issue',
  description: 'Create a GitHub issue',
  parameters: {
    title: 'string',
    body: 'string',
    labels: 'string[]',
  },
  handler: async (params) => {
    // Implementation
  },
});

await server.start();
```

### Step 4: Agent Configuration

#### Configure Customer Agent

##### 1. Create CLAUDE.md
```markdown
# agents/customer-agent/CLAUDE.md

## Customer Agent Instructions

You are the Customer Agent for AutoSDLC. Your responsibilities include:
- Maintaining product vision and requirements
- Validating implementations against specifications
- Providing acceptance testing feedback
- Writing status updates to Agent_Output.md

## Working Directory
- You can write to: `./Agent_Output.md`
- You can read from: `../shared/Agent_Status/`
- Use commands in `.claude/commands/` for specific tasks

## Communication Protocol
- Update your status regularly in Agent_Output.md
- Check other agents' status before making decisions
- Use MCP for inter-agent communication
```

##### 2. Create Custom Commands
```bash
# agents/customer-agent/.claude/commands/validate-feature.sh
#!/bin/bash
# Validate a feature implementation
echo "Validating feature: $1"
# Implementation logic here
```

##### 3. Agent Configuration
```yaml
# agents/customer-agent/config.yaml
name: customer-agent
type: customer
capabilities:
  - requirement_validation
  - acceptance_testing
  - vision_maintenance

claudeCode:
  mode: headless
  workingDir: "./"
  outputFile: "Agent_Output.md"
  
prompts:
  system: |
    You are the Customer Agent for AutoSDLC.
    Follow instructions in CLAUDE.md for your operations.
```

#### Start Agent
```typescript
// agents/customer/index.ts
import { CustomerAgent } from '@autosdlc/agents';

const agent = new CustomerAgent({
  id: 'customer-001',
  mcpServerUrl: 'http://localhost:8080',
  config: loadConfig('./config.yaml'),
});

await agent.start();
```

### Step 5: Create Your First Project

#### 1. Initialize Project
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-first-project",
    "repository": "https://github.com/user/repo",
    "agents": ["customer", "pm", "coder", "reviewer", "tester"]
  }'
```

#### 2. Create Product Requirements
```bash
curl -X POST http://localhost:3000/api/projects/{id}/requirements \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Authentication System",
    "description": "Implement secure user authentication...",
    "acceptance_criteria": [
      "Users can register with email",
      "Password requirements enforced",
      "JWT token authentication"
    ]
  }'
```

#### 3. Start Development Workflow
```bash
curl -X POST http://localhost:3000/api/workflows/start \
  -H "Content-Type: application/json" \
  -d '{
    "type": "feature_development",
    "projectId": "{project-id}",
    "requirementId": "{requirement-id}"
  }'
```

## Development Workflow

### Test-Driven Development (TDD) Approach

#### 1. Write Tests First
```bash
# Create test files based on requirements
npm run test:create -- --feature="user-authentication"

# Write comprehensive tests without mocks
cat > tests/features/user-authentication.test.ts << 'EOF'
describe('User Authentication Feature', () => {
  it('should allow users to register with email', async () => {
    // Test implementation without mocks
    const result = await authService.register({
      email: 'test@example.com',
      password: 'SecurePass123!'
    });
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('test@example.com');
  });
  
  it('should enforce password requirements', async () => {
    // Test actual validation logic
    const weakPassword = await authService.validatePassword('weak');
    expect(weakPassword.valid).toBe(false);
    expect(weakPassword.errors).toContain('Password must be at least 8 characters');
  });
  
  it('should generate JWT tokens on successful login', async () => {
    // Test real token generation
    const token = await authService.login('test@example.com', 'password');
    expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
  });
});
EOF
```

#### 2. Verify All Tests Are Red
```bash
# Run tests to ensure they fail (no implementation yet)
npm run test:verify-red

# Generate coverage report to ensure all specs are tested
npm run test:coverage -- --feature="user-authentication"
```

#### 3. Implement to Make Tests Green
```bash
# Start implementation phase
npm run implement -- --feature="user-authentication"

# Run tests continuously during development
npm run test:watch -- --feature="user-authentication"
```

### Local Development

#### Running Tests
```bash
# Complete test cycle with automatic setup and cleanup
npm test
# This automatically handles:
# - Starting test environment
# - Running all tests with real implementations
# - Cleaning up test resources

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Verify test coverage meets requirements
npm run test:coverage
```

#### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Format code
npm run format
```

### Agent Development

#### Creating a New Agent
```typescript
// agents/custom/index.ts
import { BaseAgent } from '@autosdlc/core';

export class CustomAgent extends BaseAgent {
  async initialize(): Promise<void> {
    // Setup agent
  }
  
  async processTask(task: Task): Promise<TaskResult> {
    // Process task
  }
  
  async handleMessage(message: Message): Promise<void> {
    // Handle inter-agent communication
  }
}
```

#### Testing Agents
```typescript
// agents/custom/custom.test.ts
describe('CustomAgent', () => {
  it('should process tasks correctly', async () => {
    const agent = new CustomAgent(config);
    const result = await agent.processTask(mockTask);
    expect(result.success).toBe(true);
  });
});
```

## Configuration Examples

### Basic Configuration
```yaml
# config/autosdlc.yaml
system:
  name: "AutoSDLC"
  environment: "development"
  
mcp:
  server:
    port: 8080
    maxConnections: 100
    
agents:
  customer:
    replicas: 1
    memory: "512Mi"
  pm:
    replicas: 2
    memory: "1Gi"
  coder:
    replicas: 3
    memory: "2Gi"
    
workflows:
  feature_development:
    timeout: 3600
    retries: 3
```

### Advanced Configuration
```yaml
# config/production.yaml
system:
  name: "AutoSDLC"
  environment: "production"
  
monitoring:
  prometheus:
    enabled: true
    port: 9090
  grafana:
    enabled: true
    dashboards:
      - system-overview
      - agent-performance
      
security:
  tls:
    enabled: true
    certPath: /etc/ssl/certs
  authentication:
    type: oauth2
    provider: github
```

## Troubleshooting

### Common Issues

#### MCP Server Connection Failed
```bash
# Check if MCP server is running
curl http://localhost:8080/health

# Check logs
docker logs autosdlc-mcp-server

# Verify environment variables
npm run env:check
```

#### Agent Not Responding
```bash
# Check agent status
curl http://localhost:3000/api/agents/{agent-id}/status

# Restart agent
npm run agent:restart -- --name=customer

# Check agent logs
tail -f logs/agents/customer.log
```

#### GitHub Webhook Not Working
```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/webhooks/github \
  -H "X-GitHub-Event: ping" \
  -H "X-Hub-Signature: sha1=..." \
  -d '{}'

# Check webhook logs
grep "webhook" logs/app.log
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=autosdlc:* npm run dev
```

## Next Steps

1. **Explore Agent Capabilities**
   - [[11-Customer-Agent|Customer Agent Guide]]
   - [[12-Product-Manager-Agent|PM Agent Guide]]
   - [[13-Coder-Agent|Coder Agent Guide]]

2. **Advanced Configuration**
   - [[20-MCP-Integration|MCP Integration]]
   - [[22-Workflow-Engine|Workflow Customization]]
   - [[61-Agent-Prompt-Engineering|Prompt Engineering]]

3. **Production Deployment**
   - [[50-Deployment-Guide|Deployment Guide]]
   - [[51-Monitoring-Setup|Monitoring Setup]]
   - [[52-Security-Guidelines|Security Guidelines]]

## Resources

- **GitHub Repository**: [github.com/your-org/autosdlc](https://github.com/your-org/autosdlc)
- **API Documentation**: [[30-API-Specification|API Specification]]
- **Community Discord**: [discord.gg/autosdlc](https://discord.gg/autosdlc)
- **Video Tutorials**: [youtube.com/autosdlc](https://youtube.com/autosdlc)

---

**Tags**: #AutoSDLC #GettingStarted #Guide #Setup #QuickStart
**Last Updated**: 2025-06-09
**Next**: [[10-Agent-Framework|Agent Framework Overview →]]
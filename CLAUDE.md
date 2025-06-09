# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the AutoSDLC implementation.

## Project Overview

AutoSDLC is an AI-powered system that orchestrates 5 specialized agents to automate the entire software development lifecycle. This is the main implementation repository - we are building the actual system from scratch based on the comprehensive documentation in `/Docs`.

## Key Architectural Concepts

### Agent System
The AutoSDLC system uses 5 specialized agents that run as Claude Code instances:
- **Customer Agent**: Requirements and product vision
- **PM Agent**: Technical specifications and coordination  
- **Coder Agent**: Implementation using strict TDD
- **Code Reviewer**: Quality assurance and standards
- **Tester Agent**: Automated testing and CI/CD

### MCP Protocol
Model Context Protocol (MCP) enables agent communication:
- Each agent acts as both MCP client and server
- Bidirectional communication network
- Real-time status sharing via Agent_Output.md files

### TDD Philosophy
**Critical**: System enforces strict Test-Driven Development:
- Tests written BEFORE implementation
- No mocks - real databases, APIs, services
- 100% test coverage required
- "Red-Green-Refactor" cycle strictly followed

## Implementation Context

We are implementing the system based on documentation in `/Docs/`. Key reference files:

### Architecture Understanding
- `Docs/02-Architecture.md`: Complete system design
- `Docs/10-Agent-Framework.md`: Agent communication patterns
- `Docs/20-MCP-Integration.md`: Inter-agent protocol details

### Implementation Guidelines  
- `Docs/63-TDD-Implementation-Guide.md`: Strict TDD methodology
- `Docs/60-Development-Workflow.md`: Development processes
- `Docs/25-Claude-Code-Integration.md`: Headless agent execution

### API and Integration
- `Docs/30-API-Specification.md`: REST, GraphQL, WebSocket APIs
- `Docs/31-WebSocket-Events.md`: Real-time communication
- `Docs/21-GitHub-Integration.md`: Version control workflow

## Implementation Principles

### MVP Focus
Start with minimal viable system that can:
1. Initialize basic agent structure
2. Establish MCP communication between agents
3. Demonstrate TDD workflow with one simple feature
4. Run locally via Docker Compose

### Strict TDD Approach
1. Write failing tests first based on specifications
2. Verify ALL tests are red before implementation
3. Implement minimal code to make tests green
4. Refactor while keeping tests green
5. Achieve 80%+ coverage (block < 80%)

### Development Workflow
1. Create GitHub Project for sprint planning
2. Break work into 1-week phases
3. Each phase delivers demonstrable progress
4. Use labels: phase:N, feature, tdd, quick-win
5. Columns: Backlog → Tests Red → In Progress → Review → Done

## Technology Stack

### Core Infrastructure
- **Node.js v20+**: Runtime environment
- **TypeScript**: Primary language
- **Docker Compose**: Local development stack
- **PostgreSQL**: Primary database
- **Redis**: Caching and message queue

### Agent Runtime
- **Claude Code**: Headless execution (`cc -p`)
- **MCP**: Inter-agent communication protocol
- **File-based status**: Agent_Output.md for coordination

### Testing Framework
- **Jest/Vitest**: Test runner
- **Real implementations**: No mocks policy
- **Coverage reporting**: Must meet 80% minimum

## Project Structure (To Be Built)

```
/
├── agents/                 # Agent implementations
│   ├── customer-agent/
│   ├── pm-agent/
│   ├── coder-agent/
│   ├── reviewer-agent/
│   └── tester-agent/
├── core/                   # Shared libraries
│   ├── mcp-client/
│   ├── mcp-server/
│   └── agent-base/
├── infrastructure/         # Docker, DB, etc.
├── tests/                  # Test suites
├── docs/                   # Implementation docs
└── scripts/               # Build/deploy scripts
```

## Getting Started Commands

### Environment Setup
```bash
# Install dependencies
npm install

# Start complete development environment
npm run dev
# This command automatically:
# - Builds TypeScript code
# - Starts Docker services (PostgreSQL, Redis)
# - Runs database migrations
# - Starts MCP server
```

### TDD Workflow
```bash
# Run complete test cycle with zero footprint
npm run test
# This command automatically:
# - Starts test environment
# - Runs all tests with real implementations
# - Cleans up test resources

# For development testing
npm run test:watch

# Check coverage
npm run test:coverage
```

## Implementation Priorities

### Phase 1: Foundation (Week 1)
- Basic project structure
- Docker Compose stack
- Database schema and migrations
- MCP client/server foundation
- Basic agent lifecycle

### Phase 2: Agent Framework (Week 2)  
- Agent base classes
- MCP communication between agents
- Agent_Output.md status system
- Simple agent coordination

### Phase 3: First Feature (Week 3)
- Complete TDD cycle for one feature
- All 5 agents collaborating
- GitHub integration basics
- End-to-end demonstration

## Critical Success Factors

1. **TDD First**: No production code without failing tests
2. **Real Implementations**: No mocks in any tests
3. **Agent Coordination**: Status-based communication working
4. **Demonstrable Progress**: Each week shows working features
5. **Documentation**: Keep implementation docs current

## Process Guidelines

### GitHub Issue Workflow
- After finishing successfully each issue on GitHub, you have to leave a comment of what you've done in short and check off the tasks mentioned in the issue.
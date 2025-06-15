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
- **BAML**: Type-safe LLM interactions with schema validation
- **MCP**: Inter-agent communication protocol
- **File-based status**: Agent_Output.md for coordination

### Testing Framework
- **Jest/Vitest**: Test runner
- **Real implementations**: No mocks policy
- **Coverage reporting**: Must meet 80% minimum
- **BAML Testing**: Schema validation for all LLM interactions

## Project Structure (Current)

```
/
├── src/                    # Source code
│   ├── agents/            # All 5 agents implemented (87% coverage)
│   │   ├── customer-agent.ts      # Requirements validation
│   │   ├── pm-agent.ts           # GitHub integration (mocked)
│   │   ├── coder-agent.ts        # TDD implementation (mocked)
│   │   ├── code-reviewer-agent.ts # Code analysis (mocked)
│   │   ├── tester-agent.ts       # Test execution (mocked)
│   │   ├── base-agent.ts         # Base agent framework
│   │   └── mcp-client.ts         # MCP communication
│   ├── core/              # Database and MCP server
│   ├── workflow/          # Workflow orchestration
│   └── types/             # TypeScript definitions
├── tests/                 # Comprehensive test suite
│   ├── unit/              # Unit tests (passing)
│   └── integration/       # Integration tests (skipped for Phase 3)
├── Docs/                  # 30+ specification documents
├── docker-compose.yml     # Complete development stack
└── scripts/               # Database migrations and utilities
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

### Phase 3: Mock to Reality Implementation (5 Weeks)
**Current Status**: Foundation complete, agents implemented with mock tools
**Goal**: Transform mock implementations into real autonomous development system

**Track 1: Core Integration (Weeks 1-2)**
- Real GitHub API integration replacing mock implementations
- File system operations for actual code/test generation
- Jest/Vitest integration for real test execution
- Database persistence for workflow state

**Track 2: Advanced Intelligence (Weeks 2-3)**
- Enhanced requirement analysis and validation
- Real static analysis and code review tools
- Predictive workflow optimization
- Intelligent error recovery systems

**Track 3: Production Infrastructure (Weeks 3-4)**
- Real-time monitoring dashboard
- Authentication and authorization
- Kubernetes deployment readiness
- Comprehensive security framework

**Track 4: AI Enhancement (Weeks 4-5)**
- Multi-language code generation
- Collaborative multi-project workflows
- Advanced agent coordination
- Performance optimization

## Critical Success Factors

1. **TDD First**: No production code without failing tests
2. **Real Implementations**: No mocks in any tests
3. **Agent Coordination**: Status-based communication working
4. **Demonstrable Progress**: Each week shows working features
5. **Documentation**: Keep implementation docs current

## Phase 3 Implementation Guidelines

### Current Status Assessment
- **Robust Foundation**: 87% test coverage, all 5 agents implemented
- **Mock Implementations**: Agent tools return simulated data vs real operations
- **Architecture Ready**: MCP communication, database, Docker stack complete
- **TDD Framework**: Comprehensive workflow orchestration (needs real integration)

### Phase 3 Priorities (Mock → Reality + BAML Integration)
0. **BAML Foundation**: Integrate BAML framework for type-safe, schema-validated LLM interactions (Issue #20)
1. **GitHub API Integration**: Replace PM Agent mock GitHub operations with BAML-enhanced real API
2. **File System Operations**: Enable Coder Agent to create/modify actual files with BAML validation
3. **Test Execution**: Connect Tester Agent to real Jest/Vitest execution with BAML schemas
4. **Static Analysis**: Integrate Code Reviewer Agent with ESLint/security tools using BAML
5. **Workflow Persistence**: Connect WorkflowCoordinator to database logging with BAML validation

### Implementation Strategy
- **Start with BAML foundation** - integrate schema-validated LLM interactions first
- **Enhance one agent tool at a time** - BAML + real implementation before moving to next
- **Maintain existing architecture** - BAML enhances rather than replaces current structure
- **Follow TDD principles** - write integration tests first, then implement with BAML
- **Focus on real operations** - eliminate all mock/simulation responses with BAML validation

### Success Metrics
- **95%+ test coverage** with real implementations (currently 87%)
- **Zero mock implementations** in any agent tool
- **100% BAML schema validation** for all agent interactions
- **Complete end-to-end workflow** from requirements to GitHub deployment
- **Real-time monitoring** via enhanced dashboard with BAML-structured data

## Process Guidelines

### GitHub Issue Workflow
- After finishing successfully each issue on GitHub, you have to leave a comment of what you've done in short and check off the tasks mentioned in the issue.

### Phase 3 Development Process
1. **Read Phase-3-Sophisticated-Plan.md** for detailed implementation tracks
2. **Focus on replacing ONE mock implementation at a time**
3. **Write integration tests first** following TDD methodology
4. **Validate real operations** before moving to next component
5. **Update documentation** as implementations become real
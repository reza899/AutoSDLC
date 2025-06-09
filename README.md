# AutoSDLC Implementation

**Autonomous Software Development Lifecycle** - AI-powered development agent system

## 🎯 Project Status

**Current Phase**: Phase 1 ✅ COMPLETE  
**Next Phase**: Phase 2 (Agent Framework)  
**Overall Progress**: Foundation established, ready for agent development  

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### Development Setup

⚠️ **IMPORTANT**: Docker must be running before starting development.

```bash
# Clone repository
git clone https://github.com/reza899/AutoSDLC.git
cd AutoSDLC

# Install dependencies
npm install

# Ensure Docker is running
docker --version
# If Docker is not running, start Docker Desktop or Docker daemon

# Start complete development environment
npm run dev
# This automatically handles:
# - Building TypeScript code
# - Starting Docker services (PostgreSQL, Redis)
# - Running database migrations
# - Starting MCP server

# Verify health
curl http://localhost:8080/health
```

### Manual Docker Setup

If `npm run dev` fails, you can start services manually:

```bash
# Build TypeScript
npm run build

# Start Docker services
docker-compose up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose ps

# Run migrations
npm run db:migrate

# Start MCP server
npm run mcp:server
```

### Testing

```bash
# Run complete test cycle with automatic setup and cleanup
npm test
# This automatically handles:
# - Starting test environment (Docker services)
# - Running all tests with real implementations
# - Cleaning up test resources and stopping services

# For development with persistent test environment
npm run test:coverage

# Run specific test suites (requires manual test environment)
npm test tests/unit/mcp-server.test.ts    # No Docker required
npm test tests/unit/database.test.ts      # Requires PostgreSQL
npm test tests/integration/docker.test.ts # Requires full Docker stack
```

### Test Requirements by Suite

| Test Suite | Docker Required | Services Needed |
|------------|----------------|-----------------|
| `mcp-server.test.ts` | ❌ No | None (unit tests only) |
| `database.test.ts` | ✅ Yes | PostgreSQL container |
| `docker.test.ts` | ✅ Yes | Full stack (PostgreSQL, Redis, MCP server) |

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start complete development environment (build, services, migrations, server) |
| `npm test` | Run complete test cycle with automatic setup and cleanup |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run build` | Build TypeScript |
| `docker-compose up -d` | Start infrastructure services (manual) |
| `docker-compose down` | Stop all services |

## 🏗️ Architecture

### Current Implementation (Phase 1)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Server    │    │   PostgreSQL    │    │     Redis       │
│   Port: 8080    │◄──►│   Port: 5432    │    │   Port: 6379    │
│   Health: /health│    │   DB: autosdlc   │    │   Cache/Queue   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Planned Architecture (Phase 2+)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Customer Agent  │    │    PM Agent     │    │  Coder Agent    │
│   Claude Code   │◄──►│   Claude Code   │◄──►│  Claude Code    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   MCP Server    │
                    │ (Communication) │
                    └─────────────────┘
```

## 🧪 Testing Strategy

### Test-Driven Development (TDD)
- **Red-Green-Refactor** cycle strictly followed
- **No Mocks** - all tests use real implementations
- **80%+ Coverage** required for all features

### Test Philosophy

- All tests use real implementations (no mocks)
- Database tests run against real PostgreSQL
- Integration tests verify full Docker stack
- Minimum 80% coverage requirement enforced

## 📁 Project Structure

```
├── src/
│   ├── core/
│   │   ├── mcp-server.ts          # MCP server implementation
│   │   └── database-manager.ts    # Database operations
│   ├── types/
│   │   └── config.ts              # TypeScript definitions
│   └── mcp-server.ts              # Application entry point
├── tests/
│   ├── unit/                      # Unit tests
│   └── integration/               # Integration tests
├── docs/
│   └── Phase-1-Technical-Report.md # Complete technical documentation
├── docker-compose.yml             # Production services
├── docker-compose.test.yml        # Test services
├── Dockerfile                     # Production container
└── Dockerfile.test               # Test container
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
MCP_PORT=8080
MCP_HOST=0.0.0.0

# Database Configuration  
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# OR individual settings:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=autosdlc
DB_USER=postgres
DB_PASSWORD=postgres

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

### Docker Configuration

⚠️ **CRITICAL**: Docker must be running for the system to work properly.

The system uses Docker Compose for service orchestration:

- **PostgreSQL**: Database with persistence and health checks
- **Redis**: Cache and message queue  
- **MCP Server**: Main application with health endpoint

**Docker Requirements:**
- Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- Docker Compose v2+
- Available ports: 5432 (PostgreSQL), 6379 (Redis), 8080 (MCP Server)

**Starting Docker Services:**
```bash
# Development environment
docker-compose up -d

# Test environment (different ports)
docker-compose -f docker-compose.test.yml up -d

# Check services are healthy
docker-compose ps
```

## 📊 Health Monitoring

### Health Endpoints

- **MCP Server**: `GET /health`
  ```json
  {
    "status": "healthy",
    "timestamp": "2025-06-09T01:05:50.640Z",
    "version": "0.1.0",
    "uptime": 28787
  }
  ```

- **Database**: Connection pool status
- **Redis**: Ping response verification

## 🚧 Development Workflow

### Adding New Features (TDD)

1. **Write failing tests first**
   ```bash
   npm test -- --watch
   ```

2. **Verify tests are red**
   ```bash
   npm run test:verify-red
   ```

3. **Implement minimal code to pass**

4. **Verify tests are green**
   ```bash
   npm test
   ```

5. **Refactor while maintaining green**

6. **Check coverage meets 80%**
   ```bash
   npm run test:coverage
   ```

## 📖 Documentation

- **[System Documentation](Docs/)**: Comprehensive system specifications  
- **[Getting Started Guide](Docs/03-Getting-Started.md)**: Quick start guide
- **[API Documentation](Docs/30-API-Specification.md)**: REST, GraphQL, WebSocket APIs
- **[Architecture Overview](Docs/02-Architecture.md)**: System design and patterns

## 🎯 Phase Completion Status

### ✅ Phase 1: Foundation Week (COMPLETE)
- MCP Server with health checks
- Database with migrations and transactions  
- Docker stack with service orchestration
- Comprehensive testing (80%+ coverage)

### 🔄 Phase 2: Agent Framework (NEXT)
- Agent base classes
- MCP client/server communication
- Agent_Output.md status system
- First working agent implementation

### 📅 Phase 3: Multi-Agent Collaboration (PLANNED)
- All 5 agents working together
- End-to-end feature development
- GitHub integration
- Complete workflow demonstration

## 🤝 Contributing

### Development Environment Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Start development stack: `npm run dev`
5. Run tests: `npm test`

### Pull Request Process

1. Create feature branch from `main`
2. Write tests first (TDD)
3. Implement features
4. Ensure 80%+ test coverage
5. Update documentation
6. Submit pull request

## 🔒 Security

- Database connections use parameter binding
- CORS configured for known origins
- Environment-based secrets management
- Container isolation for services

## 📝 License

This project is part of the AutoSDLC system. See LICENSE file for details.

## 🙋‍♀️ Support

- **Issues**: [GitHub Issues](https://github.com/reza899/AutoSDLC/issues)
- **Documentation**: [Technical Documentation](docs/)
- **Health Check**: [Server Status](http://localhost:8080/health)

---

**Built with**: TypeScript, Express.js, PostgreSQL, Redis, Docker  
**Testing**: Jest, Supertest, Real Implementations (No Mocks)  
**Development**: Test-Driven Development (TDD)  
**Status**: Phase 1 Complete ✅

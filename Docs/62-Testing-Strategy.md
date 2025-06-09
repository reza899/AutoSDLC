# Testing Strategy - Test-Driven Development

#AutoSDLC #Testing #TDD #Strategy

[[AutoSDLC Documentation Hub|← Back to Index]] | [[61-Agent-Prompt-Engineering|← Prompt Engineering]]

## Overview

AutoSDLC follows a strict Test-Driven Development (TDD) approach where tests are written first based on requirements, verified to fail (red phase), and then implementation follows to make tests pass (green phase). This document outlines our comprehensive testing strategy without using mocks, ensuring real integration testing throughout the development lifecycle.

**Critical TDD Workflow:**
1. **Write Tests First**: Based on product specifications, write comprehensive tests without any mocks
2. **Verify Red State**: Run tests to ensure ALL tests fail (no implementation exists)
3. **Verify Coverage**: Ensure tests cover all aspects of the product specification
4. **Implement to Green**: Write minimal code to make tests pass
5. **Refactor**: Improve code quality while keeping tests green

## TDD Philosophy

### Core Principles

1. **Tests First**: Write tests before any implementation code
2. **No Mocks**: Use real implementations and integrations
3. **Red-Green-Refactor**: Follow the classic TDD cycle
4. **Full Coverage**: Ensure all product specifications are tested
5. **Continuous Validation**: Tests run continuously during development

### Benefits

- **Requirements Validation**: Tests serve as executable specifications
- **Design Emergence**: Implementation design emerges from test requirements
- **Confidence**: Real integration tests provide high confidence
- **Documentation**: Tests document expected behavior
- **Refactoring Safety**: Tests enable safe refactoring

## Test Categories

### 1. Unit Tests (No Mocks)

```typescript
// Example: Testing without mocks
describe('GitHubService', () => {
  let service: GitHubService;
  let testRepo: string;
  
  beforeAll(async () => {
    // Use real GitHub API with test repository
    service = new GitHubService({
      token: process.env.GITHUB_TEST_TOKEN,
      owner: 'test-org',
      repo: 'test-repo'
    });
    
    // Create actual test repository
    testRepo = await service.createTestRepository();
  });
  
  afterAll(async () => {
    // Clean up real resources
    await service.deleteRepository(testRepo);
  });
  
  it('should create real GitHub issues', async () => {
    const issue = await service.createIssue({
      title: 'Test Issue',
      body: 'Test Description',
      labels: ['test']
    });
    
    expect(issue.number).toBeGreaterThan(0);
    expect(issue.state).toBe('open');
    
    // Verify issue exists in GitHub
    const fetched = await service.getIssue(issue.number);
    expect(fetched.title).toBe('Test Issue');
  });
});
```

### 2. Integration Tests

```typescript
describe('Agent Integration', () => {
  let customerAgent: CustomerAgent;
  let pmAgent: PMAgent;
  let realMCPServer: MCPServer;
  
  beforeAll(async () => {
    // Start real MCP server
    realMCPServer = new MCPServer({ port: 8080 });
    await realMCPServer.start();
    
    // Start real agents
    customerAgent = new CustomerAgent({
      workingDir: './test-agents/customer',
      mcpUrl: 'http://localhost:8080'
    });
    
    pmAgent = new PMAgent({
      workingDir: './test-agents/pm',
      mcpUrl: 'http://localhost:8080'
    });
    
    await customerAgent.start();
    await pmAgent.start();
  });
  
  it('should handle real agent communication', async () => {
    // Create real requirement
    const requirement = await customerAgent.createRequirement({
      title: 'User Authentication',
      description: 'Implement secure login',
      acceptanceCriteria: [
        'Users can login with email/password',
        'Passwords are hashed',
        'JWT tokens are generated'
      ]
    });
    
    // PM agent should receive and process it
    const issue = await waitForIssueCreation(pmAgent, requirement.id);
    
    expect(issue).toBeDefined();
    expect(issue.title).toContain('User Authentication');
    expect(issue.body).toContain('Acceptance Criteria');
  });
});
```

### 3. End-to-End Tests

```typescript
describe('Complete Feature Development Flow', () => {
  let system: AutoSDLCSystem;
  
  beforeAll(async () => {
    // Start complete system
    system = await AutoSDLCSystem.start({
      config: './test-config.yaml',
      agents: ['customer', 'pm', 'coder', 'reviewer', 'tester']
    });
  });
  
  it('should complete full feature development cycle', async () => {
    // Create feature request
    const feature = await system.createFeature({
      name: 'Shopping Cart',
      requirements: [
        'Add items to cart',
        'Remove items from cart',
        'Calculate total price',
        'Apply discounts'
      ]
    });
    
    // Wait for implementation
    const implementation = await system.waitForImplementation(feature.id, {
      timeout: 300000 // 5 minutes
    });
    
    // Verify real implementation
    expect(implementation.pullRequest).toBeDefined();
    expect(implementation.testsPass).toBe(true);
    expect(implementation.codeReviewApproved).toBe(true);
    
    // Test the actual implementation
    const cart = new implementation.ShoppingCart();
    cart.addItem({ id: '1', price: 10.00, quantity: 2 });
    expect(cart.getTotal()).toBe(20.00);
  });
});
```

## TDD Workflow

### Phase 1: Write Tests (Red)

```bash
# Generate test structure from requirements
npm run tdd:generate-tests -- --requirement="REQ-001"

# Example generated test file
cat > tests/features/REQ-001-user-auth.test.ts << 'EOF'
describe('REQ-001: User Authentication', () => {
  describe('Registration', () => {
    it('should allow new users to register with valid email', async () => {
      const result = await authService.register({
        email: 'user@example.com',
        password: 'SecurePass123!'
      });
      
      expect(result.success).toBe(true);
      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBe('user@example.com');
    });
    
    it('should reject registration with invalid email', async () => {
      const result = await authService.register({
        email: 'invalid-email',
        password: 'SecurePass123!'
      });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
    
    it('should enforce password complexity requirements', async () => {
      const testCases = [
        { password: 'weak', valid: false },
        { password: '12345678', valid: false },
        { password: 'NoNumbers!', valid: false },
        { password: 'NoSpecial8', valid: false },
        { password: 'ValidPass123!', valid: true }
      ];
      
      for (const testCase of testCases) {
        const result = await authService.validatePassword(testCase.password);
        expect(result.valid).toBe(testCase.valid);
      }
    });
  });
  
  describe('Login', () => {
    it('should authenticate users with correct credentials', async () => {
      // First register
      await authService.register({
        email: 'test@example.com',
        password: 'TestPass123!'
      });
      
      // Then login
      const result = await authService.login('test@example.com', 'TestPass123!');
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });
    
    it('should reject login with incorrect password', async () => {
      const result = await authService.login('test@example.com', 'WrongPassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });
  
  describe('JWT Token Validation', () => {
    it('should validate genuine tokens', async () => {
      const loginResult = await authService.login('test@example.com', 'TestPass123!');
      const validation = await authService.validateToken(loginResult.token);
      
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBeDefined();
      expect(validation.email).toBe('test@example.com');
    });
    
    it('should reject tampered tokens', async () => {
      const loginResult = await authService.login('test@example.com', 'TestPass123!');
      const tamperedToken = loginResult.token.slice(0, -5) + 'XXXXX';
      
      const validation = await authService.validateToken(tamperedToken);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid token signature');
    });
  });
});
EOF
```

### Phase 2: Verify Red State

```bash
# Run tests to ensure they fail
npm test

# Output should show all tests failing
# ✗ REQ-001: User Authentication
#   ✗ Registration
#     ✗ should allow new users to register with valid email
#     ✗ should reject registration with invalid email
#     ✗ should enforce password complexity requirements
#   ✗ Login
#     ✗ should authenticate users with correct credentials
#     ✗ should reject login with incorrect password
#   ✗ JWT Token Validation
#     ✗ should validate genuine tokens
#     ✗ should reject tampered tokens

# Verify coverage of requirements
npm run test:coverage -- --requirement="REQ-001"
```

### Phase 3: Implementation (Green)

```typescript
// Implementation guided by failing tests
export class AuthService {
  private db: Database;
  private jwtSecret: string;
  
  constructor(config: AuthConfig) {
    // Real database connection
    this.db = new Database(config.database);
    this.jwtSecret = config.jwtSecret;
  }
  
  async register(input: RegisterInput): Promise<RegisterResult> {
    // Validate email
    if (!this.isValidEmail(input.email)) {
      return {
        success: false,
        errors: ['Invalid email format']
      };
    }
    
    // Validate password
    const passwordValidation = await this.validatePassword(input.password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        errors: passwordValidation.errors
      };
    }
    
    // Hash password with real crypto
    const hashedPassword = await bcrypt.hash(input.password, 10);
    
    // Store in real database
    const user = await this.db.users.create({
      email: input.email,
      password: hashedPassword,
      createdAt: new Date()
    });
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    };
  }
  
  async validatePassword(password: string): Promise<PasswordValidation> {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  async login(email: string, password: string): Promise<LoginResult> {
    // Query real database
    const user = await this.db.users.findOne({ email });
    
    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
    
    // Verify with real bcrypt
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
    
    // Generate real JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      this.jwtSecret,
      { expiresIn: '24h' }
    );
    
    return {
      success: true,
      token
    };
  }
  
  async validateToken(token: string): Promise<TokenValidation> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      return {
        valid: true,
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message === 'invalid signature' 
          ? 'Invalid token signature' 
          : 'Invalid token'
      };
    }
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### Phase 4: Refactor

```typescript
// After tests pass, refactor for better design
export class AuthService {
  private validators: Validators;
  private crypto: CryptoService;
  private tokenService: TokenService;
  
  constructor(private config: AuthConfig, private db: Database) {
    this.validators = new Validators();
    this.crypto = new CryptoService();
    this.tokenService = new TokenService(config.jwtSecret);
  }
  
  async register(input: RegisterInput): Promise<RegisterResult> {
    // Refactored with better separation of concerns
    const validation = await this.validators.validateRegistration(input);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    
    const hashedPassword = await this.crypto.hashPassword(input.password);
    const user = await this.db.users.create({
      email: input.email,
      password: hashedPassword
    });
    
    return {
      success: true,
      user: this.sanitizeUser(user)
    };
  }
  
  // ... refactored methods
}
```

## Agent-Specific Testing

### Customer Agent Tests

```typescript
describe('Customer Agent', () => {
  let agent: CustomerAgent;
  let workingDir: string;
  
  beforeEach(async () => {
    workingDir = await createTempAgentDir('customer');
    agent = await startCustomerAgent(workingDir);
  });
  
  it('should validate implementations against requirements', async () => {
    // Create requirement
    const requirement = {
      id: 'REQ-001',
      description: 'User can reset password',
      acceptanceCriteria: [
        'User receives reset email',
        'Reset link expires after 1 hour',
        'Password must be changed after reset'
      ]
    };
    
    // Create implementation
    const implementation = {
      code: await readFile('./test-implementations/password-reset.ts'),
      tests: await readFile('./test-implementations/password-reset.test.ts')
    };
    
    // Agent validates
    const validation = await agent.validateImplementation(requirement, implementation);
    
    expect(validation.approved).toBe(true);
    expect(validation.feedback).toContain('All acceptance criteria met');
    
    // Check Agent_Output.md was updated
    const output = await readFile(path.join(workingDir, 'Agent_Output.md'));
    expect(output).toContain('Validation completed for REQ-001');
  });
});
```

### PM Agent Tests

```typescript
describe('PM Agent', () => {
  let agent: PMAgent;
  let github: GitHubService;
  
  beforeEach(async () => {
    agent = await startPMAgent('./test-agents/pm');
    github = new GitHubService(testConfig);
  });
  
  it('should create GitHub issues from requirements', async () => {
    const requirement = {
      title: 'API Rate Limiting',
      description: 'Implement rate limiting for API endpoints',
      priority: 'high',
      acceptanceCriteria: [
        'Limit requests to 100/minute per user',
        'Return 429 status when limit exceeded',
        'Include retry-after header'
      ]
    };
    
    // PM Agent processes requirement
    const issue = await agent.createIssueFromRequirement(requirement);
    
    // Verify real GitHub issue
    const githubIssue = await github.getIssue(issue.number);
    
    expect(githubIssue.title).toBe('[Feature] API Rate Limiting');
    expect(githubIssue.body).toContain('## Acceptance Criteria');
    expect(githubIssue.labels).toContain('enhancement');
    expect(githubIssue.labels).toContain('high-priority');
  });
});
```

### Coder Agent Tests

```typescript
describe('Coder Agent TDD', () => {
  let agent: CoderAgent;
  
  beforeEach(async () => {
    agent = await startCoderAgent('./test-agents/coder');
  });
  
  it('should implement code to pass failing tests', async () => {
    // Provide failing tests
    const failingTests = await readFile('./test-specs/shopping-cart.test.ts');
    
    // Agent implements code
    const implementation = await agent.implementFromTests({
      tests: failingTests,
      requirements: 'Implement shopping cart with add, remove, and total calculation'
    });
    
    // Verify implementation passes tests
    const testResult = await runTests(implementation.code, failingTests);
    
    expect(testResult.passed).toBe(true);
    expect(testResult.failures).toHaveLength(0);
    
    // Verify code quality
    const lintResult = await eslint.lintText(implementation.code);
    expect(lintResult.errorCount).toBe(0);
  });
});
```

## Test Infrastructure

### Test Database

```yaml
# test-config/database.yaml
test:
  database:
    type: postgresql
    host: localhost
    port: 5433  # Different port for test DB
    database: autosdlc_test
    migrations:
      auto: true
      clean: true  # Clean DB before each test run
```

### Test GitHub Organization

```yaml
# test-config/github.yaml
test:
  github:
    organization: autosdlc-test
    token: ${GITHUB_TEST_TOKEN}
    repositories:
      prefix: test-repo-
      cleanup: true  # Delete after tests
```

### Test Execution

```json
{
  "scripts": {
    "test": "docker-compose -f docker-compose.test.yml up -d && jest --no-cache --runInBand && docker-compose -f docker-compose.test.yml down",
    "test:watch": "jest --watch --no-cache",
    "test:coverage": "jest --coverage",
    "tdd:generate-tests": "node scripts/generate-tests.js",
    "test:integration": "jest --config=jest.integration.config.js",
    "test:e2e": "jest --config=jest.e2e.config.js"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,  // 30 seconds for real integrations
  maxWorkers: 1,       // Run tests serially for real resources
};
```

## Continuous Testing

### GitHub Actions Workflow

```yaml
# .github/workflows/tdd.yml
name: TDD Workflow

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432
          
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup test database
        run: npm run db:test:setup
        
      - name: Run tests (TDD workflow)
        run: npm test
        
      - name: Check coverage
        run: npm run test:coverage
        
      - name: Run integration tests
        run: npm run test:integration
        env:
          GITHUB_TEST_TOKEN: ${{ secrets.GITHUB_TEST_TOKEN }}
```

## Best Practices

### 1. Test Design
- Write tests that describe behavior, not implementation
- Use descriptive test names that explain the requirement
- Group related tests using describe blocks
- Keep tests independent and idempotent

### 2. No Mocks Policy
- Use real databases with test data
- Use real API endpoints with test accounts
- Use real file systems with temp directories
- Clean up resources after tests

### 3. Test Data Management
- Use factories for consistent test data
- Reset database state before each test
- Use unique identifiers to avoid conflicts
- Clean up external resources (GitHub, files)

### 4. Performance
- Run tests in parallel where possible
- Use connection pooling for databases
- Cache static test data
- Monitor test execution time

### 5. Debugging
- Use verbose logging in tests
- Capture screenshots/artifacts on failure
- Include context in error messages
- Use test retries sparingly

## Metrics and Reporting

### Coverage Reports

```bash
# Generate detailed coverage report
npm run test:coverage

# View coverage trends
npm run test:coverage:history
```

### Test Performance

```typescript
// Track test execution time
class TestMetrics {
  static async trackTestDuration(testName: string, duration: number) {
    await this.metricsDB.insert({
      test: testName,
      duration: duration,
      timestamp: new Date(),
      commit: process.env.GITHUB_SHA
    });
  }
  
  static async getSlowTests(threshold: number = 5000) {
    return this.metricsDB.query(`
      SELECT test, AVG(duration) as avg_duration
      FROM test_metrics
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY test
      HAVING AVG(duration) > $1
      ORDER BY avg_duration DESC
    `, [threshold]);
  }
}
```

## Related Documents

- [[03-Getting-Started|Getting Started Guide]]
- [[10-Agent-Framework|Agent Framework]]
- [[60-Development-Workflow|Development Workflow]]
- [[61-Agent-Prompt-Engineering|Agent Prompt Engineering]]

---

**Tags**: #AutoSDLC #Testing #TDD #Strategy #Quality
**Last Updated**: 2025-06-09
**Next**: [[50-Deployment-Guide|Deployment Guide →]]

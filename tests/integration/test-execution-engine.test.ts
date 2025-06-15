/**
 * Test Execution Engine Integration Tests
 * 
 * Tests for real test execution replacing mock implementations.
 * These tests follow TDD principles - written BEFORE implementation.
 * 
 * Tests will be RED initially (failing) until real test execution is implemented.
 */

import { TesterAgent } from '../../src/agents/tester-agent';
import { CoderAgent } from '../../src/agents/coder-agent';
import { DatabaseManager } from '../../src/core/database-manager';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

describe('Test Execution Engine Integration', () => {
  let testerAgent: TesterAgent;
  let coderAgent: CoderAgent;
  let database: DatabaseManager;
  let workspaceBase: string;
  let testProjectDir: string;

  beforeAll(async () => {
    // Setup test environment
    workspaceBase = path.join(__dirname, '../temp/test-execution');
    testProjectDir = path.join(workspaceBase, 'test-project');
    const sharedStatusDir = path.join(workspaceBase, 'shared-status');
    
    // Create workspace directories
    fs.mkdirSync(workspaceBase, { recursive: true });
    fs.mkdirSync(testProjectDir, { recursive: true });
    fs.mkdirSync(sharedStatusDir, { recursive: true });

    // Initialize test project
    process.chdir(testProjectDir);
    execSync('git init');
    execSync('git config user.email "test@autosdlc.com"');
    execSync('git config user.name "AutoSDLC Test"');

    // Create package.json with test frameworks
    const packageJson = {
      name: 'test-execution-test-project',
      version: '1.0.0',
      scripts: {
        test: 'jest --verbose',
        'test:coverage': 'jest --coverage --verbose',
        'test:watch': 'jest --watch',
        'test:unit': 'jest --testPathPattern=unit',
        'test:integration': 'jest --testPathPattern=integration',
        'test:e2e': 'jest --testPathPattern=e2e'
      },
      devDependencies: {
        '@types/jest': '^29.0.0',
        '@types/node': '^20.0.0',
        'jest': '^29.0.0',
        'ts-jest': '^29.0.0',
        'typescript': '^5.0.0',
        '@testing-library/jest-dom': '^6.0.0'
      },
      jest: {
        preset: 'ts-jest',
        testEnvironment: 'node',
        collectCoverageFrom: [
          'src/**/*.{ts,js}',
          '!src/**/*.d.ts',
          '!src/**/*.test.{ts,js}'
        ],
        coverageReporters: ['json', 'lcov', 'text', 'html'],
        coverageThreshold: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
          }
        }
      }
    };
    fs.writeFileSync(path.join(testProjectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: 'es2020',
        module: 'commonjs',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts']
    };
    fs.writeFileSync(path.join(testProjectDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

    // Install dependencies (in real implementation)
    try {
      execSync('npm install', { stdio: 'pipe' });
    } catch (error) {
      // Dependencies might not be available in test environment
      console.warn('Could not install npm dependencies for test project');
    }

    // Initialize database
    database = new DatabaseManager({
      host: 'localhost',
      port: 5432,
      database: 'autosdlc_test',
      username: 'autosdlc',
      password: 'autosdlc_password'
    });
    await database.connect();

    // Initialize agents
    testerAgent = new TesterAgent({
      agentId: 'tester-test-agent',
      agentType: 'tester-agent',
      workspaceDir: testProjectDir,
      sharedStatusDir: sharedStatusDir,
      mcpServerUrl: 'http://localhost:9999'
    });

    coderAgent = new CoderAgent({
      agentId: 'coder-test-agent',
      agentType: 'coder-agent',
      workspaceDir: testProjectDir,
      sharedStatusDir: sharedStatusDir,
      mcpServerUrl: 'http://localhost:9999'
    });

    await testerAgent.initialize();
    await coderAgent.initialize();
  });

  afterAll(async () => {
    await testerAgent.shutdown();
    await coderAgent.shutdown();
    await database.disconnect();
    
    // Cleanup test workspace
    if (fs.existsSync(workspaceBase)) {
      fs.rmSync(workspaceBase, { recursive: true, force: true });
    }
  });

  describe('Real Jest Test Execution', () => {
    let testFiles: string[];
    let sourceFiles: string[];

    beforeEach(async () => {
      // Create test files and implementation
      const testSpec = {
        name: 'MathUtils',
        description: 'Mathematical utility functions',
        specifications: [
          'should add two numbers correctly',
          'should subtract two numbers correctly',
          'should multiply two numbers correctly',
          'should divide two numbers correctly',
          'should calculate factorial correctly',
          'should handle edge cases properly'
        ]
      };

      const testResult = await coderAgent.invokeTool('writeFailingTests', testSpec);
      testFiles = testResult.testFiles;

      const implResult = await coderAgent.invokeTool('implementCode', {
        feature: { name: 'MathUtils', description: 'Math utilities' },
        testFiles: testFiles
      });
      sourceFiles = implResult.filesCreated;
    });

    it('should execute real Jest unit tests and return accurate results', async () => {
      // TDD: This test will be RED until real implementation
      const testSuite = {
        testFiles: testFiles,
        testType: 'unit',
        framework: 'jest'
      };

      const result = await testerAgent.invokeTool('runUnitTests', testSuite);

      // Assertions for real test execution
      expect(result).toHaveProperty('testsRun');
      expect(result.testsRun).toBeGreaterThan(0);
      expect(result).toHaveProperty('testsPassed');
      expect(result).toHaveProperty('testsFailed');
      expect(result).toHaveProperty('testsSkipped');
      expect(result).toHaveProperty('totalTests');
      expect(result.totalTests).toBe(result.testsRun);

      // Should have detailed test results
      expect(result).toHaveProperty('testResults');
      expect(result.testResults).toBeInstanceOf(Array);
      expect(result.testResults.length).toBeGreaterThan(0);

      // Each test result should have required properties
      result.testResults.forEach(testResult => {
        expect(testResult).toHaveProperty('testName');
        expect(testResult).toHaveProperty('status');
        expect(['passed', 'failed', 'skipped']).toContain(testResult.status);
        expect(testResult).toHaveProperty('duration');
        expect(typeof testResult.duration).toBe('number');
        
        if (testResult.status === 'failed') {
          expect(testResult).toHaveProperty('error');
          expect(testResult).toHaveProperty('stackTrace');
        }
      });

      // Should have performance metrics
      expect(result).toHaveProperty('executionTime');
      expect(typeof result.executionTime).toBe('number');
      expect(result.executionTime).toBeGreaterThan(0);

      // Should indicate real execution (not mock)
      expect(result).toHaveProperty('realExecution');
      expect(result.realExecution).toBe(true);
    });

    it('should provide accurate code coverage analysis', async () => {
      const coverageSpec = {
        testFiles: testFiles,
        sourceFiles: sourceFiles,
        coverageType: 'comprehensive',
        includeReports: ['lcov', 'html', 'json']
      };

      const result = await testerAgent.invokeTool('validateCoverage', coverageSpec);

      // Should have coverage metrics
      expect(result).toHaveProperty('coverage');
      expect(result.coverage).toHaveProperty('statements');
      expect(result.coverage).toHaveProperty('branches');
      expect(result.coverage).toHaveProperty('functions');
      expect(result.coverage).toHaveProperty('lines');

      // Coverage percentages should be numbers between 0 and 100
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        expect(typeof result.coverage[metric]).toBe('number');
        expect(result.coverage[metric]).toBeGreaterThanOrEqual(0);
        expect(result.coverage[metric]).toBeLessThanOrEqual(100);
      });

      // Should have file-level coverage details
      expect(result).toHaveProperty('fileCoverage');
      expect(result.fileCoverage).toBeInstanceOf(Array);
      
      result.fileCoverage.forEach(fileCov => {
        expect(fileCov).toHaveProperty('fileName');
        expect(fileCov).toHaveProperty('statements');
        expect(fileCov).toHaveProperty('branches');
        expect(fileCov).toHaveProperty('functions');
        expect(fileCov).toHaveProperty('lines');
        expect(fileCov).toHaveProperty('uncoveredLines');
      });

      // Should generate coverage reports
      expect(result).toHaveProperty('coverageReports');
      expect(result.coverageReports).toHaveProperty('lcov');
      expect(result.coverageReports).toHaveProperty('html');
      expect(result.coverageReports).toHaveProperty('json');

      // Coverage files should exist
      expect(fs.existsSync(result.coverageReports.lcov)).toBe(true);
      expect(fs.existsSync(result.coverageReports.json)).toBe(true);
    });

    it('should handle test failures and provide detailed diagnostics', async () => {
      // Create intentionally failing test
      const failingTestContent = `
describe('FailingTest', () => {
  it('should fail intentionally', () => {
    expect(1 + 1).toBe(3); // This will fail
  });

  it('should throw an error', () => {
    throw new Error('Intentional test error');
  });

  it('should timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Long timeout
  }, 1000); // 1 second timeout
});
`;

      const failingTestFile = path.join(testProjectDir, 'src/__tests__/failing-test.test.ts');
      fs.mkdirSync(path.dirname(failingTestFile), { recursive: true });
      fs.writeFileSync(failingTestFile, failingTestContent);

      const result = await testerAgent.invokeTool('runUnitTests', {
        testFiles: [failingTestFile],
        includeFailureDetails: true
      });

      expect(result.testsFailed).toBeGreaterThan(0);
      expect(result).toHaveProperty('failureDetails');
      expect(result.failureDetails).toBeInstanceOf(Array);
      expect(result.failureDetails.length).toBeGreaterThan(0);

      // Check failure details
      const failureDetail = result.failureDetails.find(f => f.testName.includes('should fail intentionally'));
      expect(failureDetail).toBeDefined();
      expect(failureDetail.error).toMatch(/expected.*3.*received.*2/i);
      expect(failureDetail).toHaveProperty('stackTrace');

      const errorDetail = result.failureDetails.find(f => f.testName.includes('should throw an error'));
      expect(errorDetail).toBeDefined();
      expect(errorDetail.error).toMatch(/Intentional test error/);

      const timeoutDetail = result.failureDetails.find(f => f.testName.includes('should timeout'));
      expect(timeoutDetail).toBeDefined();
      expect(timeoutDetail.error).toMatch(/timeout|exceeded/i);
    });
  });

  describe('Integration Test Execution', () => {
    it('should execute integration tests with database setup', async () => {
      // Create integration test that requires database
      const integrationTestContent = `
import { DatabaseManager } from '../../../src/core/database-manager';

describe('Database Integration', () => {
  let database: DatabaseManager;

  beforeAll(async () => {
    database = new DatabaseManager({
      host: 'localhost',
      port: 5432,
      database: 'autosdlc_test',
      username: 'autosdlc',
      password: 'autosdlc_password'
    });
    await database.connect();
  });

  afterAll(async () => {
    await database.disconnect();
  });

  it('should connect to database successfully', async () => {
    const result = await database.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
  });

  it('should create and query test table', async () => {
    await database.query('CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name VARCHAR(100))');
    await database.query("INSERT INTO test_table (name) VALUES ('integration test')");
    const result = await database.query('SELECT name FROM test_table WHERE name = $1', ['integration test']);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe('integration test');
    await database.query('DROP TABLE test_table');
  });
});
`;

      const integrationTestFile = path.join(testProjectDir, 'src/__tests__/integration/database.integration.test.ts');
      fs.mkdirSync(path.dirname(integrationTestFile), { recursive: true });
      fs.writeFileSync(integrationTestFile, integrationTestContent);

      const result = await testerAgent.invokeTool('runIntegrationTests', {
        testFiles: [integrationTestFile],
        setupDatabase: true,
        testEnvironment: 'test'
      });

      expect(result).toHaveProperty('testsRun');
      expect(result.testsRun).toBeGreaterThan(0);
      expect(result).toHaveProperty('testsPassed');
      expect(result.testsPassed).toBeGreaterThan(0);
      expect(result).toHaveProperty('setupCompleted');
      expect(result.setupCompleted).toBe(true);
    });

    it('should handle test environment setup and teardown', async () => {
      const envTestSpec = {
        testFiles: testFiles,
        environmentSetup: {
          database: true,
          redis: true,
          mockServices: ['github-api', 'email-service'],
          env: {
            NODE_ENV: 'test',
            LOG_LEVEL: 'error',
            TEST_MODE: 'true'
          }
        }
      };

      const result = await testerAgent.invokeTool('runIntegrationTests', envTestSpec);

      expect(result).toHaveProperty('environmentSetup');
      expect(result.environmentSetup).toHaveProperty('completed');
      expect(result.environmentSetup.completed).toBe(true);
      expect(result.environmentSetup).toHaveProperty('services');
      expect(result.environmentSetup.services).toEqual(
        expect.arrayContaining(['database', 'redis'])
      );
      expect(result).toHaveProperty('environmentTeardown');
      expect(result.environmentTeardown.completed).toBe(true);
    });
  });

  describe('End-to-End Test Execution', () => {
    it('should execute E2E tests with real browser automation', async () => {
      // Create E2E test for web application
      const e2eTestContent = `
import { Browser, Page } from 'puppeteer';

describe('AutoSDLC Dashboard E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // Browser setup would be handled by TesterAgent
    // This is just the test structure
  });

  afterAll(async () => {
    // Cleanup handled by TesterAgent
  });

  it('should load dashboard successfully', async () => {
    // E2E test for dashboard loading
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForSelector('[data-testid="dashboard-header"]');
    
    const title = await page.title();
    expect(title).toMatch(/AutoSDLC Dashboard/);
  });

  it('should display agent status correctly', async () => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForSelector('[data-testid="agent-status-grid"]');
    
    const agentCards = await page.$$('[data-testid="agent-card"]');
    expect(agentCards.length).toBe(5); // 5 agents
  });
});
`;

      const e2eTestFile = path.join(testProjectDir, 'src/__tests__/e2e/dashboard.e2e.test.ts');
      fs.mkdirSync(path.dirname(e2eTestFile), { recursive: true });
      fs.writeFileSync(e2eTestFile, e2eTestContent);

      const result = await testerAgent.invokeTool('runE2ETests', {
        testFiles: [e2eTestFile],
        browser: 'chromium',
        headless: true,
        baseUrl: 'http://localhost:3000',
        waitForServices: ['web-server', 'database', 'redis']
      });

      expect(result).toHaveProperty('testsRun');
      expect(result).toHaveProperty('browserSetup');
      expect(result.browserSetup.completed).toBe(true);
      expect(result).toHaveProperty('servicesDependencies');
      expect(result.servicesDependencies).toEqual(
        expect.arrayContaining(['web-server', 'database', 'redis'])
      );
    });

    it('should capture screenshots and videos for failed E2E tests', async () => {
      const failingE2ETest = `
describe('Failing E2E Test', () => {
  it('should fail and capture evidence', async () => {
    // This test is designed to fail
    await page.goto('http://localhost:3000/nonexistent-page');
    await page.waitForSelector('[data-testid="nonexistent-element"]', { timeout: 1000 });
  });
});
`;

      const failingTestFile = path.join(testProjectDir, 'src/__tests__/e2e/failing.e2e.test.ts');
      fs.writeFileSync(failingTestFile, failingE2ETest);

      const result = await testerAgent.invokeTool('runE2ETests', {
        testFiles: [failingTestFile],
        captureFailures: {
          screenshots: true,
          videos: true,
          consoleLogs: true,
          networkLogs: true
        }
      });

      expect(result.testsFailed).toBeGreaterThan(0);
      expect(result).toHaveProperty('failureArtifacts');
      expect(result.failureArtifacts).toHaveProperty('screenshots');
      expect(result.failureArtifacts).toHaveProperty('videos');
      expect(result.failureArtifacts).toHaveProperty('logs');

      // Verify artifacts exist
      result.failureArtifacts.screenshots.forEach(screenshot => {
        expect(fs.existsSync(screenshot.path)).toBe(true);
        expect(screenshot.path).toMatch(/\.png$/);
      });
    });
  });

  describe('Test Performance and Optimization', () => {
    it('should execute tests in parallel for better performance', async () => {
      const parallelTestSpecs = Array.from({ length: 10 }, (_, i) => ({
        name: `ParallelTest${i + 1}`,
        specifications: [`should run in parallel ${i + 1}`]
      }));

      // Create multiple test files
      const testCreationPromises = parallelTestSpecs.map(spec => 
        coderAgent.invokeTool('writeFailingTests', spec)
      );
      const testResults = await Promise.all(testCreationPromises);
      const allTestFiles = testResults.flatMap(r => r.testFiles);

      const startTime = Date.now();
      
      const result = await testerAgent.invokeTool('runUnitTests', {
        testFiles: allTestFiles,
        parallel: true,
        maxWorkers: 4
      });

      const elapsedTime = Date.now() - startTime;

      expect(result).toHaveProperty('parallelExecution');
      expect(result.parallelExecution.enabled).toBe(true);
      expect(result.parallelExecution.workers).toBe(4);
      expect(result.testsRun).toBe(10);
      
      // Parallel execution should be faster than sequential
      expect(elapsedTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should optimize test execution order based on historical data', async () => {
      const optimizationSpec = {
        testFiles: testFiles,
        optimization: {
          enabled: true,
          strategy: 'historical_performance',
          prioritizeFailing: true,
          prioritizeSlow: false
        }
      };

      const result = await testerAgent.invokeTool('runUnitTests', optimizationSpec);

      expect(result).toHaveProperty('executionOptimization');
      expect(result.executionOptimization.enabled).toBe(true);
      expect(result.executionOptimization).toHaveProperty('executionOrder');
      expect(result.executionOptimization).toHaveProperty('optimizationStrategy');
      expect(result.executionOptimization.optimizationStrategy).toBe('historical_performance');
    });

    it('should provide detailed performance metrics and insights', async () => {
      const performanceSpec = {
        testFiles: testFiles,
        performanceAnalysis: {
          enabled: true,
          includeMemoryUsage: true,
          includeCpuUsage: true,
          detectSlowTests: true,
          slowTestThreshold: 1000 // 1 second
        }
      };

      const result = await testerAgent.invokeTool('runUnitTests', performanceSpec);

      expect(result).toHaveProperty('performanceMetrics');
      expect(result.performanceMetrics).toHaveProperty('totalExecutionTime');
      expect(result.performanceMetrics).toHaveProperty('averageTestTime');
      expect(result.performanceMetrics).toHaveProperty('memoryUsage');
      expect(result.performanceMetrics).toHaveProperty('cpuUsage');
      expect(result.performanceMetrics).toHaveProperty('slowTests');

      // Memory and CPU usage should be tracked
      expect(typeof result.performanceMetrics.memoryUsage.peak).toBe('number');
      expect(typeof result.performanceMetrics.memoryUsage.average).toBe('number');
      expect(typeof result.performanceMetrics.cpuUsage.peak).toBe('number');
      expect(typeof result.performanceMetrics.cpuUsage.average).toBe('number');
    });
  });

  describe('Test Result Reporting and Analytics', () => {
    it('should generate comprehensive test reports', async () => {
      const reportSpec = {
        testFiles: testFiles,
        generateReports: {
          junit: true,
          html: true,
          json: true,
          markdown: true
        }
      };

      const result = await testerAgent.invokeTool('generateReport', reportSpec);

      expect(result).toHaveProperty('reports');
      expect(result.reports).toHaveProperty('junit');
      expect(result.reports).toHaveProperty('html');
      expect(result.reports).toHaveProperty('json');
      expect(result.reports).toHaveProperty('markdown');

      // Verify report files exist
      Object.values(result.reports).forEach(reportPath => {
        expect(fs.existsSync(reportPath)).toBe(true);
      });

      // JUnit report should be valid XML
      const junitContent = fs.readFileSync(result.reports.junit, 'utf-8');
      expect(junitContent).toMatch(/<testsuite/);
      expect(junitContent).toMatch(/<testcase/);

      // HTML report should be valid HTML
      const htmlContent = fs.readFileSync(result.reports.html, 'utf-8');
      expect(htmlContent).toMatch(/<html/);
      expect(htmlContent).toMatch(/Test Results/);
    });

    it('should track test trends and historical data', async () => {
      const trendSpec = {
        testFiles: testFiles,
        trackTrends: true,
        storageLocation: path.join(testProjectDir, 'test-history.json')
      };

      // Run tests multiple times to establish trend
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await testerAgent.invokeTool('runUnitTests', trendSpec);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      const latestResult = results[results.length - 1];
      expect(latestResult).toHaveProperty('trendAnalysis');
      expect(latestResult.trendAnalysis).toHaveProperty('historicalRuns');
      expect(latestResult.trendAnalysis.historicalRuns).toBeGreaterThan(1);
      expect(latestResult.trendAnalysis).toHaveProperty('performanceTrend');
      expect(latestResult.trendAnalysis).toHaveProperty('stabilityScore');

      // Verify historical data is stored
      expect(fs.existsSync(trendSpec.storageLocation)).toBe(true);
      const historyData = JSON.parse(fs.readFileSync(trendSpec.storageLocation, 'utf-8'));
      expect(historyData.runs).toBeInstanceOf(Array);
      expect(historyData.runs.length).toBe(3);
    });
  });
});
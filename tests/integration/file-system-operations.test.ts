/**
 * File System Operations Integration Tests
 * 
 * Tests for real file system operations replacing mock implementations.
 * These tests follow TDD principles - written BEFORE implementation.
 * 
 * Tests will be RED initially (failing) until real file operations are implemented.
 */

import { CoderAgent } from '../../src/agents/coder-agent';
import { DatabaseManager } from '../../src/core/database-manager';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

describe('File System Operations Integration', () => {
  let coderAgent: CoderAgent;
  let database: DatabaseManager;
  let workspaceBase: string;
  let testProjectDir: string;

  beforeAll(async () => {
    // Setup test environment
    workspaceBase = path.join(__dirname, '../temp/file-ops-test');
    testProjectDir = path.join(workspaceBase, 'test-project');
    const sharedStatusDir = path.join(workspaceBase, 'shared-status');
    
    // Create workspace directories
    fs.mkdirSync(workspaceBase, { recursive: true });
    fs.mkdirSync(testProjectDir, { recursive: true });
    fs.mkdirSync(sharedStatusDir, { recursive: true });

    // Initialize test git repository
    process.chdir(testProjectDir);
    execSync('git init');
    execSync('git config user.email "test@autosdlc.com"');
    execSync('git config user.name "AutoSDLC Test"');

    // Create basic package.json for TypeScript project
    const packageJson = {
      name: 'autosdlc-test-project',
      version: '1.0.0',
      scripts: {
        test: 'jest',
        'test:coverage': 'jest --coverage'
      },
      devDependencies: {
        '@types/jest': '^29.0.0',
        '@types/node': '^20.0.0',
        'jest': '^29.0.0',
        'ts-jest': '^29.0.0',
        'typescript': '^5.0.0'
      }
    };
    fs.writeFileSync(path.join(testProjectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Initialize database
    database = new DatabaseManager({
      host: 'localhost',
      port: 5432,
      database: 'autosdlc_test',
      username: 'autosdlc',
      password: 'autosdlc_password'
    });
    await database.connect();

    // Initialize Coder Agent with real file operations
    coderAgent = new CoderAgent({
      agentId: 'coder-test-agent',
      agentType: 'coder-agent',
      workspaceDir: testProjectDir,
      sharedStatusDir: sharedStatusDir,
      mcpServerUrl: 'http://localhost:9999'
    });

    await coderAgent.initialize();
  });

  afterAll(async () => {
    await coderAgent.shutdown();
    await database.disconnect();
    
    // Cleanup test workspace
    if (fs.existsSync(workspaceBase)) {
      fs.rmSync(workspaceBase, { recursive: true, force: true });
    }
  });

  describe('Real Test File Generation', () => {
    it('should create actual Jest test files with proper syntax', async () => {
      // TDD: This test will be RED until real implementation
      const testSpec = {
        name: 'Calculator',
        description: 'A simple calculator with basic arithmetic operations',
        specifications: [
          'should add two numbers correctly',
          'should subtract two numbers correctly',
          'should multiply two numbers correctly',
          'should divide two numbers correctly',
          'should handle division by zero'
        ]
      };

      const result = await coderAgent.invokeTool('writeFailingTests', testSpec);

      // Assertions for real file creation
      expect(result).toHaveProperty('testsCreated');
      expect(result.testsCreated).toBeGreaterThan(0);
      expect(result).toHaveProperty('testFiles');
      expect(result.testFiles).toBeInstanceOf(Array);
      expect(result.testFiles.length).toBeGreaterThan(0);

      // Verify actual test files exist
      const testFile = result.testFiles[0];
      expect(fs.existsSync(testFile)).toBe(true);

      // Verify test file content is valid Jest syntax
      const testContent = fs.readFileSync(testFile, 'utf-8');
      expect(testContent).toMatch(/describe\s*\(\s*['"`]Calculator['"`]/);
      expect(testContent).toMatch(/it\s*\(\s*['"`]should add two numbers correctly['"`]/);
      expect(testContent).toMatch(/it\s*\(\s*['"`]should subtract two numbers correctly['"`]/);
      expect(testContent).toMatch(/it\s*\(\s*['"`]should multiply two numbers correctly['"`]/);
      expect(testContent).toMatch(/it\s*\(\s*['"`]should divide two numbers correctly['"`]/);
      expect(testContent).toMatch(/it\s*\(\s*['"`]should handle division by zero['"`]/);

      // Verify tests are initially failing (RED phase)
      expect(result).toHaveProperty('allTestsFailing');
      expect(result.allTestsFailing).toBe(true);

      // Try to run the tests - they should fail initially
      try {
        process.chdir(testProjectDir);
        execSync('npm test', { stdio: 'pipe' });
        fail('Tests should have failed initially (RED phase)');
      } catch (error) {
        // This is expected - tests should fail in RED phase
        expect(error).toBeDefined();
      }
    });

    it('should generate TypeScript test files with proper imports and types', async () => {
      const testSpec = {
        name: 'UserService',
        description: 'Service for managing user operations',
        specifications: [
          'should create a new user with valid data',
          'should validate user email format',
          'should hash user password before storage',
          'should throw error for duplicate email'
        ],
        language: 'typescript',
        framework: 'jest'
      };

      const result = await coderAgent.invokeTool('writeFailingTests', testSpec);

      const testFile = result.testFiles[0];
      expect(testFile).toMatch(/\.test\.ts$/);
      expect(fs.existsSync(testFile)).toBe(true);

      const testContent = fs.readFileSync(testFile, 'utf-8');
      
      // Verify TypeScript-specific syntax
      expect(testContent).toMatch(/import.*from/);
      expect(testContent).toMatch(/interface.*User/);
      expect(testContent).toMatch(/: string/);
      expect(testContent).toMatch(/: boolean/);
      expect(testContent).toMatch(/expect.*toThrow/);
    });

    it('should support different testing frameworks', async () => {
      const viteTestSpec = {
        name: 'ComponentRenderer',
        description: 'Component rendering utilities',
        specifications: [
          'should render component with props',
          'should handle component updates',
          'should cleanup component on unmount'
        ],
        language: 'typescript',
        framework: 'vitest'
      };

      const result = await coderAgent.invokeTool('writeFailingTests', viteTestSpec);

      const testFile = result.testFiles[0];
      const testContent = fs.readFileSync(testFile, 'utf-8');
      
      // Verify Vitest-specific syntax
      expect(testContent).toMatch(/import.*vitest/);
      expect(testContent).toMatch(/describe|test|it/);
      expect(testContent).toMatch(/expect/);
    });
  });

  describe('Real Source Code Generation', () => {
    let testFiles: string[];

    beforeEach(async () => {
      // Create test files first
      const testSpec = {
        name: 'Calculator',
        description: 'A simple calculator with basic arithmetic operations',
        specifications: [
          'should add two numbers correctly',
          'should subtract two numbers correctly',
          'should multiply two numbers correctly',
          'should divide two numbers correctly'
        ]
      };

      const testResult = await coderAgent.invokeTool('writeFailingTests', testSpec);
      testFiles = testResult.testFiles;
    });

    it('should generate actual source code files that make tests pass', async () => {
      const implementationSpec = {
        feature: {
          name: 'Calculator',
          description: 'A simple calculator with basic arithmetic operations'
        },
        testFiles: testFiles
      };

      const result = await coderAgent.invokeTool('implementCode', implementationSpec);

      // Assertions for real code generation
      expect(result).toHaveProperty('filesCreated');
      expect(result.filesCreated).toBeInstanceOf(Array);
      expect(result.filesCreated.length).toBeGreaterThan(0);

      // Verify actual source files exist
      const sourceFile = result.filesCreated[0];
      expect(fs.existsSync(sourceFile)).toBe(true);
      expect(sourceFile).toMatch(/\.(ts|js)$/);
      expect(sourceFile).not.toMatch(/\.test\./);

      // Verify source file content
      const sourceContent = fs.readFileSync(sourceFile, 'utf-8');
      expect(sourceContent).toMatch(/class Calculator|export.*Calculator/);
      expect(sourceContent).toMatch(/add.*\(/);
      expect(sourceContent).toMatch(/subtract.*\(/);
      expect(sourceContent).toMatch(/multiply.*\(/);
      expect(sourceContent).toMatch(/divide.*\(/);

      // Verify tests now pass (GREEN phase)
      expect(result).toHaveProperty('allTestsPassing');
      expect(result.allTestsPassing).toBe(true);

      // Actually run the tests to verify they pass
      process.chdir(testProjectDir);
      const testOutput = execSync('npm test', { encoding: 'utf-8' });
      expect(testOutput).toMatch(/PASS/);
      expect(testOutput).not.toMatch(/FAIL/);
    });

    it('should generate code with proper TypeScript types and interfaces', async () => {
      const implementationSpec = {
        feature: {
          name: 'UserService',
          description: 'Service for managing user operations',
          interfaces: [
            {
              name: 'User',
              properties: {
                id: 'string',
                email: 'string',
                name: 'string',
                createdAt: 'Date'
              }
            }
          ]
        },
        testFiles: testFiles,
        language: 'typescript'
      };

      const result = await coderAgent.invokeTool('implementCode', implementationSpec);

      const sourceFile = result.filesCreated[0];
      const sourceContent = fs.readFileSync(sourceFile, 'utf-8');

      // Verify TypeScript-specific syntax
      expect(sourceContent).toMatch(/interface User/);
      expect(sourceContent).toMatch(/id: string/);
      expect(sourceContent).toMatch(/email: string/);
      expect(sourceContent).toMatch(/: User\[\]/);
      expect(sourceContent).toMatch(/: Promise<User>/);
    });

    it('should measure and report code coverage accurately', async () => {
      const implementationSpec = {
        feature: {
          name: 'Calculator',
          description: 'Calculator with comprehensive test coverage'
        },
        testFiles: testFiles
      };

      const result = await coderAgent.invokeTool('implementCode', implementationSpec);

      expect(result).toHaveProperty('coverage');
      expect(typeof result.coverage).toBe('number');
      expect(result.coverage).toBeGreaterThan(80); // Should meet coverage threshold

      // Run actual coverage analysis
      process.chdir(testProjectDir);
      const coverageOutput = execSync('npm run test:coverage', { encoding: 'utf-8' });
      
      expect(coverageOutput).toMatch(/Statements.*:\s*(\d+)%/);
      expect(coverageOutput).toMatch(/Branches.*:\s*(\d+)%/);
      expect(coverageOutput).toMatch(/Functions.*:\s*(\d+)%/);
      expect(coverageOutput).toMatch(/Lines.*:\s*(\d+)%/);
    });
  });

  describe('Git Operations Integration', () => {
    it('should stage and commit generated files automatically', async () => {
      const testSpec = {
        name: 'GitIntegrationTest',
        description: 'Testing Git operations with file generation',
        specifications: ['should integrate with Git correctly']
      };

      const testResult = await coderAgent.invokeTool('writeFailingTests', testSpec);
      
      const implementationResult = await coderAgent.invokeTool('implementCode', {
        feature: { name: 'GitIntegrationTest', description: 'Git integration test' },
        testFiles: testResult.testFiles,
        gitOperations: {
          autoCommit: true,
          commitMessage: 'feat: add GitIntegrationTest implementation',
          branch: 'feature/git-integration-test'
        }
      });

      expect(implementationResult).toHaveProperty('gitOperations');
      expect(implementationResult.gitOperations).toHaveProperty('committed');
      expect(implementationResult.gitOperations.committed).toBe(true);
      expect(implementationResult.gitOperations).toHaveProperty('commitHash');

      // Verify Git operations
      process.chdir(testProjectDir);
      const gitLog = execSync('git log --oneline -1', { encoding: 'utf-8' });
      expect(gitLog).toMatch(/feat: add GitIntegrationTest implementation/);

      const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
      expect(gitStatus.trim()).toBe(''); // Working directory should be clean
    });

    it('should create feature branches for new implementations', async () => {
      const branchName = 'feature/auto-generated-feature';
      
      const result = await coderAgent.invokeTool('createFeatureBranch', {
        branchName: branchName,
        fromBranch: 'main'
      });

      expect(result).toHaveProperty('branchCreated');
      expect(result.branchCreated).toBe(true);
      expect(result).toHaveProperty('currentBranch');
      expect(result.currentBranch).toBe(branchName);

      // Verify branch exists and is current
      process.chdir(testProjectDir);
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      expect(currentBranch).toBe(branchName);
    });

    it('should handle merge conflicts intelligently', async () => {
      // Create conflicting changes
      const conflictingSpec = {
        name: 'ConflictTest',
        description: 'Testing conflict resolution',
        specifications: ['should handle conflicts'],
        conflictResolution: 'automatic'
      };

      // This should handle conflicts gracefully
      const result = await coderAgent.invokeTool('handleMergeConflicts', conflictingSpec);

      expect(result).toHaveProperty('conflictsResolved');
      expect(result.conflictsResolved).toBe(true);
      expect(result).toHaveProperty('resolutionStrategy');
      expect(result.resolutionStrategy).toBe('automatic');
    });
  });

  describe('File System Performance and Reliability', () => {
    it('should handle concurrent file operations safely', async () => {
      const concurrentSpecs = Array.from({ length: 5 }, (_, i) => ({
        name: `ConcurrentTest${i + 1}`,
        description: `Concurrent test ${i + 1}`,
        specifications: [`should work concurrently ${i + 1}`]
      }));

      const promises = concurrentSpecs.map(spec => 
        coderAgent.invokeTool('writeFailingTests', spec)
      );

      const results = await Promise.all(promises);

      // All operations should succeed
      results.forEach((result, index) => {
        expect(result).toHaveProperty('testsCreated');
        expect(result.testsCreated).toBeGreaterThan(0);
        expect(result.testFiles[0]).toMatch(`ConcurrentTest${index + 1}`);
        expect(fs.existsSync(result.testFiles[0])).toBe(true);
      });

      // Verify no file corruption or conflicts
      results.forEach(result => {
        const content = fs.readFileSync(result.testFiles[0], 'utf-8');
        expect(content).toMatch(/describe.*ConcurrentTest\d+/);
        expect(content).toMatch(/should work concurrently \d+/);
      });
    });

    it('should implement atomic file operations with rollback', async () => {
      const atomicSpec = {
        name: 'AtomicTest',
        description: 'Testing atomic operations',
        specifications: ['should be atomic'],
        operations: 'atomic',
        simulateFailure: true // Force failure to test rollback
      };

      await expect(
        coderAgent.invokeTool('writeFailingTests', atomicSpec)
      ).rejects.toThrow();

      // Verify no partial files were created
      const testFiles = fs.readdirSync(testProjectDir).filter(f => f.includes('AtomicTest'));
      expect(testFiles.length).toBe(0);
    });

    it('should maintain file operation audit trail', async () => {
      const auditSpec = {
        name: 'AuditTest',
        description: 'Testing audit trail',
        specifications: ['should be audited'],
        enableAudit: true
      };

      const result = await coderAgent.invokeTool('writeFailingTests', auditSpec);

      expect(result).toHaveProperty('auditTrail');
      expect(result.auditTrail).toBeInstanceOf(Array);
      expect(result.auditTrail.length).toBeGreaterThan(0);

      const auditEntry = result.auditTrail[0];
      expect(auditEntry).toHaveProperty('operation');
      expect(auditEntry).toHaveProperty('timestamp');
      expect(auditEntry).toHaveProperty('filePath');
      expect(auditEntry).toHaveProperty('success');
      expect(auditEntry.success).toBe(true);
    });
  });

  describe('Code Refactoring Operations', () => {
    let existingFiles: string[];

    beforeEach(async () => {
      // Create initial implementation
      const testSpec = {
        name: 'RefactorTest',
        description: 'Code to be refactored',
        specifications: ['should work before refactoring']
      };

      const testResult = await coderAgent.invokeTool('writeFailingTests', testSpec);
      const implResult = await coderAgent.invokeTool('implementCode', {
        feature: { name: 'RefactorTest', description: 'Initial implementation' },
        testFiles: testResult.testFiles
      });
      
      existingFiles = [...testResult.testFiles, ...implResult.filesCreated];
    });

    it('should refactor code while maintaining test compatibility', async () => {
      const refactorSpec = {
        files: existingFiles,
        refactorType: 'extract_method',
        targetMethod: 'calculateResult',
        improvements: ['performance', 'readability']
      };

      const result = await coderAgent.invokeTool('refactorCode', refactorSpec);

      expect(result).toHaveProperty('filesModified');
      expect(result.filesModified).toBeInstanceOf(Array);
      expect(result.filesModified.length).toBeGreaterThan(0);

      expect(result).toHaveProperty('allTestsStillPass');
      expect(result.allTestsStillPass).toBe(true);

      // Verify tests still pass after refactoring
      process.chdir(testProjectDir);
      const testOutput = execSync('npm test', { encoding: 'utf-8' });
      expect(testOutput).toMatch(/PASS/);
    });

    it('should improve code quality metrics through refactoring', async () => {
      const qualitySpec = {
        files: existingFiles,
        qualityGoals: {
          cyclomaticComplexity: 5,
          maintainabilityIndex: 80,
          duplicatedLines: 0
        }
      };

      const result = await coderAgent.invokeTool('refactorCode', qualitySpec);

      expect(result).toHaveProperty('qualityMetrics');
      expect(result.qualityMetrics.cyclomaticComplexity).toBeLessThanOrEqual(5);
      expect(result.qualityMetrics.maintainabilityIndex).toBeGreaterThanOrEqual(80);
      expect(result.qualityMetrics.duplicatedLines).toBe(0);
    });
  });
});
/**
 * TDD-007: Concrete Agent Implementations
 * 
 * Tests for 5 specialized agents that inherit from BaseAgent.
 * Tests are written FIRST and must FAIL before implementation.
 * 
 * Each agent has specific capabilities and tools:
 * - Customer Agent: Requirements validation, feedback
 * - PM Agent: Coordination, issue creation, workflow management
 * - Coder Agent: TDD implementation, code generation
 * - Code Reviewer: Quality assurance, standards enforcement
 * - Tester Agent: Test execution, CI/CD integration
 */

import { CustomerAgent } from '../../src/agents/customer-agent';
import { PMAgent } from '../../src/agents/pm-agent';
import { CoderAgent } from '../../src/agents/coder-agent';
import { CodeReviewerAgent } from '../../src/agents/code-reviewer-agent';
import { TesterAgent } from '../../src/agents/tester-agent';
import { AgentType } from '../../src/types/agent-types';
import * as fs from 'fs';
import * as path from 'path';

describe('Concrete Agent Implementations', () => {
  const testWorkspaceDir = path.join(__dirname, '../temp/agent-workspace');
  const testSharedDir = path.join(__dirname, '../temp/shared-status');

  beforeAll(() => {
    // Create test directories
    fs.mkdirSync(testWorkspaceDir, { recursive: true });
    fs.mkdirSync(testSharedDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup test directories
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testSharedDir)) {
      fs.rmSync(testSharedDir, { recursive: true, force: true });
    }
  });

  describe('CustomerAgent', () => {
    let customerAgent: CustomerAgent;
    let portCounter = 9000; // Start with unique port range

    beforeEach(() => {
      customerAgent = new CustomerAgent({
        agentId: 'customer-001',
        workspaceDir: path.join(testWorkspaceDir, 'customer'),
        sharedStatusDir: testSharedDir,
        mcpServerUrl: 'http://localhost:9999', // Use non-conflicting URL
        agentServerPort: portCounter++
      });
    });

    afterEach(async () => {
      if (customerAgent) {
        await customerAgent.stop();
      }
    });

    it('should initialize with Customer agent type', () => {
      expect(customerAgent.getAgentType()).toBe(AgentType.CUSTOMER);
      expect(customerAgent.getAgentId()).toBe('customer-001');
    });

    it('should register customer-specific tools', async () => {
      await customerAgent.start();
      
      const capabilities = customerAgent.getCapabilities();
      
      expect(capabilities).toContain('validateRequirements');
      expect(capabilities).toContain('provideFeedback');
      expect(capabilities).toContain('approveDeliverable');
      expect(capabilities).toContain('requestChanges');
    });

    it('should validate requirements against business needs', async () => {
      await customerAgent.start();

      const requirements = {
        feature: 'User Authentication',
        acceptanceCriteria: [
          'Users can log in with email/password',
          'Support OAuth 2.0 providers',
          'Implement MFA for security'
        ],
        priority: 'high',
        deadline: '2024-12-01'
      };

      const validation = await customerAgent.invokeTool('validateRequirements', {
        requirements
      });

      expect(validation.isValid).toBe(true);
      expect(validation.feedback).toBeDefined();
      expect(validation.missingCriteria).toHaveLength(0);
      expect(validation.suggestions).toBeDefined();
    });

    it('should provide structured feedback on deliverables', async () => {
      await customerAgent.start();

      const deliverable = {
        type: 'feature-implementation',
        title: 'User Authentication System',
        description: 'Complete OAuth 2.0 implementation',
        artifacts: ['auth-service.ts', 'login-component.tsx', 'auth.test.ts']
      };

      const feedback = await customerAgent.invokeTool('provideFeedback', {
        deliverable,
        userPerspective: 'business-stakeholder'
      });

      expect(feedback.approved).toBeDefined();
      expect(feedback.comments).toBeDefined();
      expect(feedback.requestedChanges).toBeDefined();
      expect(feedback.rating).toBeGreaterThanOrEqual(1);
      expect(feedback.rating).toBeLessThanOrEqual(5);
    });

    it('should handle approval workflow', async () => {
      await customerAgent.start();

      const approvalRequest = {
        deliverable: 'Authentication System v1.0',
        testResults: { passed: 45, failed: 0, coverage: 92 },
        documentation: ['API-docs.md', 'User-guide.md']
      };

      const approval = await customerAgent.invokeTool('approveDeliverable', {
        ...approvalRequest,
        approved: true
      });

      expect(approval.approved).toBe(true);
      expect(approval.timestamp).toBeDefined();
      expect(approval.approver).toBe('customer-001');
      expect(approval.nextSteps).toBeDefined();
    });
  });

  describe('PMAgent', () => {
    let pmAgent: PMAgent;
    let portCounter = 9100; // Start with unique port range for PM

    beforeEach(() => {
      pmAgent = new PMAgent({
        agentId: 'pm-001',
        workspaceDir: path.join(testWorkspaceDir, 'pm'),
        sharedStatusDir: testSharedDir,
        mcpServerUrl: 'http://localhost:9999', // Use non-conflicting URL
        agentServerPort: portCounter++,
        githubConfig: {
          owner: 'test-org',
          repo: 'test-project',
          token: 'fake-token'
        }
      });
    });

    afterEach(async () => {
      if (pmAgent) {
        await pmAgent.stop();
      }
    });

    it('should initialize with PM agent type', () => {
      expect(pmAgent.getAgentType()).toBe(AgentType.PM);
      expect(pmAgent.getAgentId()).toBe('pm-001');
    });

    it('should register PM-specific tools', async () => {
      await pmAgent.start();
      
      const capabilities = pmAgent.getCapabilities();
      
      expect(capabilities).toContain('createGitHubIssue');
      expect(capabilities).toContain('coordinateAgents');
      expect(capabilities).toContain('manageWorkflow');
      expect(capabilities).toContain('trackProgress');
      expect(capabilities).toContain('generateReport');
    });

    it('should create GitHub issues with proper structure', async () => {
      await pmAgent.start();

      const issueRequest = {
        title: 'Implement user authentication system',
        description: 'Add OAuth 2.0 support with MFA',
        labels: ['feature', 'security', 'phase-2'],
        assignee: 'coder-agent',
        milestone: 'Sprint 3',
        priority: 'high'
      };

      const issue = await pmAgent.invokeTool('createGitHubIssue', issueRequest);

      expect(issue.issueNumber).toBeDefined();
      expect(issue.url).toContain('github.com');
      expect(issue.title).toBe(issueRequest.title);
      expect(issue.labels).toEqual(expect.arrayContaining(['feature', 'tdd']));
      expect(issue.assignedAgents).toContain('coder-agent');
    });

    it('should coordinate between multiple agents', async () => {
      await pmAgent.start();

      const coordination = {
        task: 'Authentication Implementation',
        involvedAgents: ['customer-001', 'coder-001', 'reviewer-001'],
        workflow: [
          { agent: 'customer-001', action: 'validate-requirements' },
          { agent: 'coder-001', action: 'implement-tdd' },
          { agent: 'reviewer-001', action: 'review-code' }
        ]
      };

      const result = await pmAgent.invokeTool('coordinateAgents', coordination);

      expect(result.coordinationId).toBeDefined();
      expect(result.status).toBe('initiated');
      expect(result.nextAgent).toBe('customer-001');
      expect(result.timeline).toBeDefined();
    });

    it('should track and report project progress', async () => {
      await pmAgent.start();

      const progressRequest = {
        project: 'AutoSDLC Phase 2',
        timeframe: 'current-sprint'
      };

      const progress = await pmAgent.invokeTool('trackProgress', progressRequest);

      expect(progress.overallProgress).toBeGreaterThanOrEqual(0);
      expect(progress.overallProgress).toBeLessThanOrEqual(100);
      expect(progress.completedTasks).toBeDefined();
      expect(progress.activeTasks).toBeDefined();
      expect(progress.blockedTasks).toBeDefined();
      expect(progress.upcomingMilestones).toBeDefined();
    });
  });

  describe('CoderAgent', () => {
    let coderAgent: CoderAgent;
    let portCounter = 9200; // Start with unique port range for Coder

    beforeEach(() => {
      coderAgent = new CoderAgent({
        agentId: 'coder-001',
        workspaceDir: path.join(testWorkspaceDir, 'coder'),
        sharedStatusDir: testSharedDir,
        mcpServerUrl: 'http://localhost:9999', // Use non-conflicting URL
        agentServerPort: portCounter++,
        tddConfig: {
          testFramework: 'jest',
          coverageThreshold: 80,
          enforceRedGreenRefactor: true
        }
      });
    });

    afterEach(async () => {
      if (coderAgent) {
        await coderAgent.stop();
      }
    });

    it('should initialize with Coder agent type', () => {
      expect(coderAgent.getAgentType()).toBe(AgentType.CODER);
      expect(coderAgent.getAgentId()).toBe('coder-001');
    });

    it('should register coder-specific tools', async () => {
      await coderAgent.start();
      
      const capabilities = coderAgent.getCapabilities();
      
      expect(capabilities).toContain('writeFailingTests');
      expect(capabilities).toContain('implementCode');
      expect(capabilities).toContain('refactorCode');
      expect(capabilities).toContain('runTests');
      expect(capabilities).toContain('checkCoverage');
    });

    it('should enforce TDD red-green-refactor cycle', async () => {
      await coderAgent.start();

      const feature = {
        name: 'UserValidator',
        description: 'Validate user input data',
        specifications: [
          'Should validate email format',
          'Should validate password strength',
          'Should handle empty inputs gracefully'
        ]
      };

      // Step 1: Write failing tests (RED)
      const testResult = await coderAgent.invokeTool('writeFailingTests', feature);
      
      expect(testResult.testsCreated).toBeGreaterThan(0);
      expect(testResult.allTestsFailing).toBe(true);
      expect(testResult.testFiles).toContain('tests/unit/uservalidator.test.ts');

      // Step 2: Implement minimal code (GREEN)
      const implementation = await coderAgent.invokeTool('implementCode', {
        feature,
        testFiles: testResult.testFiles
      });

      expect(implementation.filesCreated).toContain('src/uservalidator.ts');
      expect(implementation.allTestsPassing).toBe(true);
      expect(implementation.coverage).toBeGreaterThanOrEqual(80);

      // Step 3: Refactor if needed
      const refactor = await coderAgent.invokeTool('refactorCode', {
        targetFiles: implementation.filesCreated,
        criteria: ['code-quality', 'performance', 'maintainability']
      });

      expect(refactor.refactored).toBeDefined();
      expect(refactor.allTestsStillPassing).toBe(true);
    });

    it('should validate test coverage requirements', async () => {
      await coderAgent.start();

      const coverageCheck = await coderAgent.invokeTool('checkCoverage', {
        targetFiles: ['src/utils/validator.ts'],
        threshold: 85
      });

      expect(coverageCheck.currentCoverage).toBeDefined();
      expect(coverageCheck.meetsCriteria).toBeDefined();
      expect(coverageCheck.uncoveredLines).toBeDefined();
      expect(coverageCheck.recommendations).toBeDefined();
    });
  });

  describe('CodeReviewerAgent', () => {
    let reviewerAgent: CodeReviewerAgent;
    let portCounter = 9300; // Start with unique port range for Reviewer

    beforeEach(() => {
      reviewerAgent = new CodeReviewerAgent({
        agentId: 'reviewer-001',
        workspaceDir: path.join(testWorkspaceDir, 'reviewer'),
        sharedStatusDir: testSharedDir,
        mcpServerUrl: 'http://localhost:9999', // Use non-conflicting URL
        agentServerPort: portCounter++,
        reviewConfig: {
          standards: ['clean-code', 'security', 'performance'],
          autoApproveThreshold: 90,
          requireTestCoverage: 80
        }
      });
    });

    afterEach(async () => {
      if (reviewerAgent) {
        await reviewerAgent.stop();
      }
    });

    it('should initialize with Code Reviewer agent type', () => {
      expect(reviewerAgent.getAgentType()).toBe(AgentType.CODE_REVIEWER);
      expect(reviewerAgent.getAgentId()).toBe('reviewer-001');
    });

    it('should register reviewer-specific tools', async () => {
      await reviewerAgent.start();
      
      const capabilities = reviewerAgent.getCapabilities();
      
      expect(capabilities).toContain('reviewCode');
      expect(capabilities).toContain('enforceStandards');
      expect(capabilities).toContain('validateTests');
      expect(capabilities).toContain('checkSecurity');
      expect(capabilities).toContain('approveChanges');
    });

    it('should perform comprehensive code review', async () => {
      await reviewerAgent.start();

      const reviewRequest = {
        pullRequest: {
          number: 123,
          title: 'Add user authentication',
          files: ['src/auth/auth-service.ts', 'tests/auth/auth-service.test.ts'],
          author: 'coder-001'
        },
        checkList: ['code-quality', 'test-coverage', 'security', 'documentation']
      };

      const review = await reviewerAgent.invokeTool('reviewCode', reviewRequest);

      expect(review.overallScore).toBeGreaterThanOrEqual(0);
      expect(review.overallScore).toBeLessThanOrEqual(100);
      expect(review.approved).toBeDefined();
      expect(review.issues).toBeDefined();
      expect(review.suggestions).toBeDefined();
      expect(review.securityChecks).toBeDefined();
      expect(review.testCoverage).toBeDefined();
    });

    it('should enforce coding standards', async () => {
      await reviewerAgent.start();

      const standardsCheck = await reviewerAgent.invokeTool('enforceStandards', {
        files: ['src/utils/helper.ts'],
        standards: ['typescript-strict', 'clean-code', 'naming-conventions']
      });

      expect(standardsCheck.violations).toBeDefined();
      expect(standardsCheck.score).toBeGreaterThanOrEqual(0);
      expect(standardsCheck.score).toBeLessThanOrEqual(100);
      expect(standardsCheck.recommendations).toBeDefined();
    });

    it('should validate security requirements', async () => {
      await reviewerAgent.start();

      const securityCheck = await reviewerAgent.invokeTool('checkSecurity', {
        files: ['src/auth/auth-service.ts'],
        checks: ['input-validation', 'sql-injection', 'xss-prevention', 'secret-exposure']
      });

      expect(securityCheck.vulnerabilities).toBeDefined();
      expect(securityCheck.riskLevel).toMatch(/^(low|medium|high|critical)$/);
      expect(securityCheck.recommendations).toBeDefined();
      expect(securityCheck.compliance).toBeDefined();
    });
  });

  describe('TesterAgent', () => {
    let testerAgent: TesterAgent;
    let portCounter = 9400; // Start with unique port range for Tester

    beforeEach(() => {
      testerAgent = new TesterAgent({
        agentId: 'tester-001',
        workspaceDir: path.join(testWorkspaceDir, 'tester'),
        sharedStatusDir: testSharedDir,
        mcpServerUrl: 'http://localhost:9999', // Use non-conflicting URL
        agentServerPort: portCounter++,
        testConfig: {
          frameworks: ['jest', 'cypress'],
          coverageThreshold: 80,
          cicdIntegration: true,
          parallelExecution: true
        }
      });
    });

    afterEach(async () => {
      if (testerAgent) {
        await testerAgent.stop();
      }
    });

    it('should initialize with Tester agent type', () => {
      expect(testerAgent.getAgentType()).toBe(AgentType.TESTER);
      expect(testerAgent.getAgentId()).toBe('tester-001');
    });

    it('should register tester-specific tools', async () => {
      await testerAgent.start();
      
      const capabilities = testerAgent.getCapabilities();
      
      expect(capabilities).toContain('runUnitTests');
      expect(capabilities).toContain('runIntegrationTests');
      expect(capabilities).toContain('runE2ETests');
      expect(capabilities).toContain('generateReport');
      expect(capabilities).toContain('validateCoverage');
      expect(capabilities).toContain('setupCI');
    });

    it('should execute comprehensive test suites', async () => {
      await testerAgent.start();

      const testExecution = await testerAgent.invokeTool('runUnitTests', {
        testFiles: ['tests/unit/**/*.test.ts'],
        parallel: true,
        coverage: true
      });

      expect(testExecution.totalTests).toBeGreaterThan(0);
      expect(testExecution.passed).toBeDefined();
      expect(testExecution.failed).toBeDefined();
      expect(testExecution.coverage).toBeDefined();
      expect(testExecution.duration).toBeDefined();
      expect(testExecution.success).toBeDefined();
    });

    it('should validate test coverage requirements', async () => {
      await testerAgent.start();

      const coverageValidation = await testerAgent.invokeTool('validateCoverage', {
        threshold: 80,
        excludeFiles: ['**/*.config.js', '**/migrations/**']
      });

      expect(coverageValidation.currentCoverage).toBeDefined();
      expect(coverageValidation.meetsThreshold).toBeDefined();
      expect(coverageValidation.uncoveredFiles).toBeDefined();
      expect(coverageValidation.recommendations).toBeDefined();
    });

    it('should generate comprehensive test reports', async () => {
      await testerAgent.start();

      const report = await testerAgent.invokeTool('generateReport', {
        includeUnitTests: true,
        includeIntegrationTests: true,
        includeE2ETests: true,
        includeCoverage: true,
        format: 'json'
      });

      expect(report.summary).toBeDefined();
      expect(report.testResults).toBeDefined();
      expect(report.coverage).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.timestamp).toBeDefined();
    });

    it('should setup CI/CD pipeline integration', async () => {
      await testerAgent.start();

      const ciSetup = await testerAgent.invokeTool('setupCI', {
        platform: 'github-actions',
        triggers: ['push', 'pull-request'],
        testTypes: ['unit', 'integration'],
        notifications: true
      });

      expect(ciSetup.configFiles).toBeDefined();
      expect(ciSetup.webhooksConfigured).toBe(true);
      expect(ciSetup.pipelineUrl).toBeDefined();
      expect(ciSetup.status).toBe('configured');
    });
  });

  describe('Agent Integration', () => {
    let allAgents: any[];
    let integrationPortCounter = 9500; // Use unique port range for integration

    beforeEach(async () => {
      // Initialize all agents for integration testing with unique ports
      allAgents = [
        new CustomerAgent({
          agentId: 'customer-integration',
          workspaceDir: path.join(testWorkspaceDir, 'customer-int'),
          sharedStatusDir: testSharedDir,
          mcpServerUrl: 'http://localhost:9999', // Use test-friendly URL
          agentServerPort: integrationPortCounter++
        }),
        new PMAgent({
          agentId: 'pm-integration',
          workspaceDir: path.join(testWorkspaceDir, 'pm-int'),
          sharedStatusDir: testSharedDir,
          mcpServerUrl: 'http://localhost:9999', // Use test-friendly URL
          agentServerPort: integrationPortCounter++,
          githubConfig: { owner: 'test', repo: 'test', token: 'fake' }
        }),
        new CoderAgent({
          agentId: 'coder-integration',
          workspaceDir: path.join(testWorkspaceDir, 'coder-int'),
          sharedStatusDir: testSharedDir,
          mcpServerUrl: 'http://localhost:9999', // Use test-friendly URL
          agentServerPort: integrationPortCounter++,
          tddConfig: { testFramework: 'jest', coverageThreshold: 80, enforceRedGreenRefactor: true }
        })
      ];
    });

    afterEach(async () => {
      // Cleanup all agents
      for (const agent of allAgents) {
        await agent.stop();
      }
      // Wait for ports to be released
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should enable all agents to communicate through MCP', async () => {
      // Start all agents
      for (const agent of allAgents) {
        await agent.start();
      }

      // Verify each agent can see others' status
      const customerAgent = allAgents[0];
      const pmAgent = allAgents[1];
      const coderAgent = allAgents[2];

      const customerStatus = await customerAgent.getAgentStatus('pm-integration');
      const pmStatus = await pmAgent.getAgentStatus('coder-integration');
      const coderStatus = await coderAgent.getAgentStatus('customer-integration');

      expect(customerStatus).toBeDefined();
      expect(pmStatus).toBeDefined();
      expect(coderStatus).toBeDefined();
    });

    it('should support end-to-end workflow coordination', async () => {
      // This test verifies the agents can work together in a complete workflow
      for (const agent of allAgents) {
        await agent.start();
      }

      const [customerAgent, pmAgent, coderAgent] = allAgents;

      // 1. Customer validates requirements
      const requirements = await customerAgent.invokeTool('validateRequirements', {
        requirements: {
          feature: 'Simple Calculator',
          acceptanceCriteria: ['Add two numbers', 'Return correct result'],
          priority: 'medium'
        }
      });

      expect(requirements.isValid).toBe(true);

      // 2. PM creates coordination plan
      const coordination = await pmAgent.invokeTool('coordinateAgents', {
        task: 'Calculator Implementation',
        involvedAgents: ['customer-integration', 'coder-integration'],
        workflow: [
          { agent: 'customer-integration', action: 'validate-requirements' },
          { agent: 'coder-integration', action: 'implement-tdd' }
        ]
      });

      expect(coordination.status).toBe('initiated');

      // 3. Coder implements with TDD
      const implementation = await coderAgent.invokeTool('writeFailingTests', {
        name: 'Calculator',
        description: 'Simple arithmetic calculator',
        specifications: ['Should add two numbers correctly']
      });

      expect(implementation.testsCreated).toBeGreaterThan(0);
      expect(implementation.allTestsFailing).toBe(true);
    });
  });
});
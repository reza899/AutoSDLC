/**
 * BAML Integration Tests
 * 
 * Tests the BAML framework integration with AutoSDLC agents,
 * ensuring schema validation, type safety, and multi-model support.
 */

import { BamlClientWrapper, BamlConfig, AgentBamlFunctions } from '../../src/agents/baml-client-wrapper';
import { BamlAgentTool, ToolConfig, ValidationResult, ValidationHelpers } from '../../src/agents/baml-agent-tool';
import { BaseAgent } from '../../src/agents/base-agent';
import { AgentType, AgentStatus, AgentConfig } from '../../src/types/agent-types';
import * as path from 'path';

describe('BAML Integration Tests', () => {
  let bamlClient: BamlClientWrapper;
  let bamlFunctions: AgentBamlFunctions;

  beforeAll(async () => {
    const config: BamlConfig = {
      projectRoot: path.resolve(__dirname, '../../'),
      defaultModel: 'claude-sonnet', // Use faster model for tests
      fallbackModels: ['gpt3-fast'],
      temperature: 0.1,
      maxTokens: 1000,
      timeout: 10000,
      retryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 1.5,
        initialDelayMs: 500
      }
    };

    bamlClient = new BamlClientWrapper(config);
    bamlFunctions = new AgentBamlFunctions(bamlClient);
  });

  describe('BAML Client Initialization', () => {
    it('should initialize BAML client successfully', async () => {
      expect(async () => {
        await bamlClient.initialize();
      }).not.toThrow();
    });

    it('should have correct configuration', () => {
      const config = bamlClient.getConfig();
      expect(config.defaultModel).toBe('claude-sonnet');
      expect(config.fallbackModels).toContain('gpt3-fast');
      expect(config.temperature).toBe(0.1);
    });

    it('should support model preference updates', () => {
      bamlClient.updateModelPreferences('gpt3-fast', ['claude-sonnet']);
      const config = bamlClient.getConfig();
      expect(config.defaultModel).toBe('gpt3-fast');
      expect(config.fallbackModels).toContain('claude-sonnet');
    });
  });

  describe('Agent Status Validation', () => {
    it('should validate correct agent status', async () => {
      const validStatus = {
        agentId: 'test-agent-001',
        agentType: 'CODER',
        status: 'READY',
        currentTask: 'Implementing user authentication',
        progress: 75,
        dependencies: ['pm-agent-001'],
        lastUpdated: new Date().toISOString(),
        metrics: {
          tasksCompleted: 5,
          errorCount: 0,
          averageTaskDuration: 1800.5,
          uptime: 3600000,
          memoryUsage: 245.8
        }
      };

      const isValid = await bamlFunctions.validateAgentStatus(validStatus);
      expect(isValid).toBe(true);
    });

    it('should reject invalid agent status', async () => {
      const invalidStatus = {
        agentId: 'test-agent-002',
        agentType: 'INVALID_TYPE',
        status: 'UNKNOWN_STATUS',
        currentTask: '', // Empty task
        progress: 150, // Invalid progress > 100
        dependencies: [],
        lastUpdated: 'invalid-date',
        metrics: {
          tasksCompleted: -1, // Negative value
          errorCount: 0,
          averageTaskDuration: 0,
          uptime: 0,
          memoryUsage: 0
        }
      };

      const isValid = await bamlFunctions.validateAgentStatus(invalidStatus);
      expect(isValid).toBe(false);
    });
  });

  describe('Agent Status Summary Generation', () => {
    it('should generate meaningful status summary', async () => {
      const agents = [
        {
          agentId: 'customer-agent',
          agentType: 'CUSTOMER',
          status: 'WORKING',
          currentTask: 'Analyzing user requirements',
          progress: 85,
          dependencies: [],
          lastUpdated: new Date().toISOString(),
          metrics: {
            tasksCompleted: 3,
            errorCount: 0,
            averageTaskDuration: 900,
            uptime: 1800000,
            memoryUsage: 180.2
          }
        },
        {
          agentId: 'pm-agent',
          agentType: 'PRODUCT_MANAGER',
          status: 'WAITING_FOR_DEPENDENCY',
          currentTask: 'Creating technical specification',
          progress: 30,
          dependencies: ['customer-agent'],
          lastUpdated: new Date().toISOString(),
          metrics: {
            tasksCompleted: 1,
            errorCount: 0,
            averageTaskDuration: 1200,
            uptime: 1200000,
            memoryUsage: 165.7
          }
        }
      ];

      const summary = await bamlFunctions.generateAgentStatusSummary(agents);
      
      expect(summary).toBeTruthy();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(50);
      expect(summary.toLowerCase()).toContain('customer');
      expect(summary.toLowerCase()).toContain('working');
    }, 15000); // Extended timeout for LLM call
  });

  describe('GitHub Operations', () => {
    it('should create GitHub issue from requirements', async () => {
      const requirements = 'Add user authentication with email/password and social login options. Must support password reset and account verification.';
      const projectContext = {
        projectName: 'TaskManager Pro',
        projectType: 'WEB_APPLICATION',
        targetAudience: 'Business professionals',
        businessGoals: ['Increase user engagement', 'Improve security'],
        successMetrics: ['User registration rate', 'Login success rate']
      };

      const issueRequest = await bamlFunctions.createGitHubIssueFromRequirements(
        requirements,
        projectContext
      );

      expect(issueRequest).toBeTruthy();
      expect(issueRequest.title).toBeTruthy();
      expect(issueRequest.body).toBeTruthy();
      expect(issueRequest.title.length).toBeLessThanOrEqual(256);
      expect(issueRequest.labels).toBeDefined();
      expect(Array.isArray(issueRequest.labels)).toBe(true);
    }, 20000);
  });

  describe('Code Generation', () => {
    it('should generate test specification from requirements', async () => {
      const testSpecRequest = {
        requirements: [
          {
            id: 'REQ-001',
            title: 'User Login',
            description: 'Users should be able to login with email and password',
            priority: 'MUST_HAVE',
            acceptanceCriteria: [
              'Valid credentials allow access',
              'Invalid credentials show error',
              'Failed attempts are logged'
            ],
            dependencies: []
          }
        ],
        technicalSpec: {
          overview: 'User authentication system',
          architecture: {
            pattern: 'MVC',
            components: [],
            integrations: [],
            scalabilityConsiderations: []
          },
          functionalRequirements: [],
          nonFunctionalRequirements: [],
          dataModel: { entities: [], relationships: [], indexes: [] },
          testingStrategy: {
            unitTestFramework: 'jest',
            integrationTestApproach: 'supertest',
            e2eTestFramework: 'cypress',
            coverageTarget: 90,
            performanceTestPlan: '',
            securityTestPlan: ''
          },
          deploymentStrategy: {
            platform: 'AWS',
            cicdPipeline: 'GitHub Actions',
            environments: [],
            rollbackStrategy: '',
            monitoringTools: []
          },
          timeline: {
            phases: [],
            totalDuration: 14,
            criticalPath: []
          }
        },
        testingFramework: 'JEST',
        language: 'TYPESCRIPT',
        existingTests: []
      };

      const testSpec = await bamlFunctions.generateTestSpecification(testSpecRequest);

      expect(testSpec).toBeTruthy();
      expect(testSpec.testFiles).toBeDefined();
      expect(Array.isArray(testSpec.testFiles)).toBe(true);
      expect(testSpec.testSuites).toBeDefined();
      expect(Array.isArray(testSpec.testSuites)).toBe(true);
    }, 25000);
  });
});

// Example BAML Agent Tool Implementation for Testing
class TestGitHubTool extends BamlAgentTool<GitHubToolInput, GitHubToolOutput> {
  protected getBamlFunctionName(): string {
    return 'createGitHubIssueFromRequirements';
  }

  protected getExpectedOutputType(): new () => GitHubToolOutput {
    return GitHubToolOutput;
  }

  protected async validateInput(input: GitHubToolInput): Promise<ValidationResult<GitHubToolInput>> {
    const errors: string[] = [];
    
    // Validate required fields
    errors.push(...ValidationHelpers.validateRequiredFields(input, ['requirements', 'projectContext']));
    
    // Validate field types
    errors.push(...ValidationHelpers.validateFieldTypes(input, {
      requirements: 'string',
      projectContext: 'object'
    }));
    
    // Validate string lengths
    if (input.requirements) {
      errors.push(...ValidationHelpers.validateStringLength(input.requirements, 'requirements', 10, 5000));
    }
    
    return {
      isValid: errors.length === 0,
      data: input,
      errors
    };
  }

  protected transformInputForBaml(input: GitHubToolInput): any {
    return {
      requirements: input.requirements,
      projectContext: input.projectContext
    };
  }

  protected async validateOutput(output: GitHubToolOutput): Promise<ValidationResult<GitHubToolOutput>> {
    const errors: string[] = [];
    
    // Validate required output fields
    errors.push(...ValidationHelpers.validateRequiredFields(output, ['title', 'body']));
    
    // Validate output constraints
    if (output.title) {
      errors.push(...ValidationHelpers.validateStringLength(output.title, 'title', 1, 256));
    }
    
    if (output.body) {
      errors.push(...ValidationHelpers.validateStringLength(output.body, 'body', 10, 10000));
    }
    
    if (output.labels) {
      errors.push(...ValidationHelpers.validateArray(output.labels, 'labels', 0, 10));
    }
    
    return {
      isValid: errors.length === 0,
      data: output,
      errors
    };
  }
}

// Type definitions for test tool
interface GitHubToolInput {
  requirements: string;
  projectContext: {
    projectName: string;
    projectType: string;
    targetAudience: string;
    businessGoals: string[];
    successMetrics: string[];
  };
}

class GitHubToolOutput {
  title!: string;
  body!: string;
  labels!: string[];
  assignees!: string[];
  milestone?: number;
  projectId?: string;
}

describe('BAML Agent Tool Base Class', () => {
  let githubTool: TestGitHubTool;

  beforeAll(() => {
    const toolConfig: ToolConfig = {
      name: 'GitHub Issue Creator',
      description: 'Creates GitHub issues from requirements',
      version: '1.0.0',
      defaultModel: 'claude-sonnet',
      temperature: 0.5,
      maxRetries: 2
    };

    githubTool = new TestGitHubTool(toolConfig, bamlClient);
  });

  it('should execute tool with valid input', async () => {
    const input: GitHubToolInput = {
      requirements: 'Implement user dashboard with analytics charts and data export functionality',
      projectContext: {
        projectName: 'Analytics Pro',
        projectType: 'WEB_APPLICATION',
        targetAudience: 'Data analysts',
        businessGoals: ['Improve data visibility', 'Enable self-service analytics'],
        successMetrics: ['Dashboard usage rate', 'Export frequency']
      }
    };

    const result = await githubTool.execute(input);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(result.metadata).toBeTruthy();
    expect(result.metadata!.validationPassed).toBe(true);
    expect(result.metadata!.executionTime).toBeGreaterThan(0);
  }, 20000);

  it('should reject invalid input', async () => {
    const invalidInput: GitHubToolInput = {
      requirements: '', // Empty requirements
      projectContext: {
        projectName: '',
        projectType: 'INVALID_TYPE',
        targetAudience: '',
        businessGoals: [],
        successMetrics: []
      }
    };

    const result = await githubTool.execute(invalidInput);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('validation failed');
    expect(result.metadata!.validationPassed).toBe(false);
  });

  it('should provide tool configuration', () => {
    const config = githubTool.getConfig();
    
    expect(config.name).toBe('GitHub Issue Creator');
    expect(config.description).toBeTruthy();
    expect(config.version).toBe('1.0.0');
    expect(config.defaultModel).toBe('claude-sonnet');
  });

  it('should allow configuration updates', () => {
    githubTool.updateConfig({ 
      defaultModel: 'gpt4',
      temperature: 0.8 
    });
    
    const config = githubTool.getConfig();
    expect(config.defaultModel).toBe('gpt4');
    expect(config.temperature).toBe(0.8);
  });
});

describe('Validation Helpers', () => {
  it('should validate required fields correctly', () => {
    const data = { name: 'test', age: 25 };
    const errors = ValidationHelpers.validateRequiredFields(data, ['name', 'email' as keyof typeof data]);
    
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('email');
  });

  it('should validate field types correctly', () => {
    const data = { name: 'test', age: '25' }; // age should be number
    const errors = ValidationHelpers.validateFieldTypes(data, { age: 'number' });
    
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('age');
    expect(errors[0]).toContain('number');
  });

  it('should validate string length correctly', () => {
    const errors = ValidationHelpers.validateStringLength('hi', 'message', 5, 100);
    
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('at least 5');
  });

  it('should validate number range correctly', () => {
    const errors = ValidationHelpers.validateNumberRange(150, 'progress', 0, 100);
    
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('at most 100');
  });

  it('should validate enum values correctly', () => {
    const errors = ValidationHelpers.validateEnum('INVALID', 'status', ['ACTIVE', 'INACTIVE']);
    
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('one of: ACTIVE, INACTIVE');
  });
});
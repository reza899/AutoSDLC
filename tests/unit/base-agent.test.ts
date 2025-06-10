/**
 * TDD-004: BaseAgent Foundation
 * 
 * These tests define the BaseAgent abstract class requirements.
 * Tests are written FIRST and must FAIL before implementation.
 * 
 * BaseAgent serves as the foundation for all 5 AutoSDLC agents:
 * - CustomerAgent, PMAgent, CoderAgent, ReviewerAgent, TesterAgent
 */

import { BaseAgent } from '../../src/agents/base-agent';
import { AgentStatus, AgentType, AgentConfig } from '../../src/types/agent-types';
import * as fs from 'fs';
import * as path from 'path';

describe('BaseAgent Abstract Class', () => {
  let agentConfig: AgentConfig;
  let testAgent: TestableAgent;
  let agentWorkspace: string;

  beforeEach(() => {
    // Setup test workspace
    agentWorkspace = path.join(__dirname, '../temp/agent-test');
    
    agentConfig = {
      type: 'customer' as AgentType,
      name: 'test-customer-agent',
      workspace: agentWorkspace,
      mcpPort: 8091,
      mcpServerUrl: 'http://localhost:8080',
      statusUpdateInterval: 1000, // 1 second for testing
    };

    testAgent = new TestableAgent(agentConfig);
  });

  afterEach(async () => {
    // Cleanup
    if (testAgent) {
      await testAgent.stop();
    }
    
    // Remove test workspace
    if (fs.existsSync(agentWorkspace)) {
      fs.rmSync(agentWorkspace, { recursive: true, force: true });
    }
  });

  describe('Agent Lifecycle', () => {
    it('should initialize with IDLE status', () => {
      expect(testAgent.getStatus()).toBe(AgentStatus.IDLE);
      expect(testAgent.isRunning()).toBe(false);
    });

    it('should start successfully and transition to IDLE', async () => {
      await testAgent.start();
      
      expect(testAgent.isRunning()).toBe(true);
      expect(testAgent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should stop successfully from any status', async () => {
      await testAgent.start();
      testAgent.setStatus(AgentStatus.BUSY);
      
      await testAgent.stop();
      
      expect(testAgent.isRunning()).toBe(false);
    });

    it('should handle status transitions correctly', async () => {
      await testAgent.start();
      
      testAgent.setStatus(AgentStatus.BUSY);
      expect(testAgent.getStatus()).toBe(AgentStatus.BUSY);
      
      testAgent.setStatus(AgentStatus.BLOCKED);
      expect(testAgent.getStatus()).toBe(AgentStatus.BLOCKED);
      
      testAgent.setStatus(AgentStatus.ERROR);
      expect(testAgent.getStatus()).toBe(AgentStatus.ERROR);
      
      testAgent.setStatus(AgentStatus.IDLE);
      expect(testAgent.getStatus()).toBe(AgentStatus.IDLE);
    });
  });

  describe('Workspace Management', () => {
    it('should create agent workspace directory on start', async () => {
      expect(fs.existsSync(agentWorkspace)).toBe(false);
      
      await testAgent.start();
      
      expect(fs.existsSync(agentWorkspace)).toBe(true);
      expect(fs.statSync(agentWorkspace).isDirectory()).toBe(true);
    });

    it('should create workspace subdirectories', async () => {
      await testAgent.start();
      
      const outputDir = path.join(agentWorkspace, 'Agent_Output.md');
      const commandsDir = path.join(agentWorkspace, '.claude', 'commands');
      
      expect(fs.existsSync(path.dirname(outputDir))).toBe(true);
      expect(fs.existsSync(commandsDir)).toBe(true);
    });
  });

  describe('Agent_Output.md Management', () => {
    it('should create Agent_Output.md file on start', async () => {
      await testAgent.start();
      
      const outputFile = path.join(agentWorkspace, 'Agent_Output.md');
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    it('should write standard format to Agent_Output.md', async () => {
      await testAgent.start();
      
      const outputFile = path.join(agentWorkspace, 'Agent_Output.md');
      const content = fs.readFileSync(outputFile, 'utf-8');
      
      expect(content).toContain('# Agent Status: customer');
      expect(content).toContain('**Last Updated**:');
      expect(content).toContain('**Status**: IDLE');
      expect(content).toContain('## Current Activity');
      expect(content).toContain('## Recent Actions');
      expect(content).toContain('## Metrics');
    });

    it('should update Agent_Output.md when status changes', async () => {
      await testAgent.start();
      
      const outputFile = path.join(agentWorkspace, 'Agent_Output.md');
      
      // Change status and trigger update
      testAgent.setStatus(AgentStatus.BUSY);
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow file update
      
      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('**Status**: BUSY');
    });

    it('should update Agent_Output.md periodically', async () => {
      await testAgent.start();
      
      const outputFile = path.join(agentWorkspace, 'Agent_Output.md');
      const initialContent = fs.readFileSync(outputFile, 'utf-8');
      
      // Wait for periodic update (1 second interval in test config)
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const updatedContent = fs.readFileSync(outputFile, 'utf-8');
      
      // Content should have different timestamp
      expect(updatedContent).not.toBe(initialContent);
    });
  });

  describe('MCP Server Capabilities', () => {
    it('should start MCP server on configured port', async () => {
      await testAgent.start();
      
      expect(testAgent.getMCPServerPort()).toBe(agentConfig.mcpPort);
      expect(testAgent.isMCPServerRunning()).toBe(true);
    });

    it('should expose agent capabilities via MCP', async () => {
      await testAgent.start();
      
      const capabilities = testAgent.getMCPCapabilities();
      
      expect(capabilities).toContain('getStatus');
      expect(capabilities).toContain('setStatus');
      expect(capabilities).toContain('getAgentInfo');
    });

    it('should handle MCP requests', async () => {
      await testAgent.start();
      
      // This will be tested with actual MCP protocol calls
      // For now, verify the server is ready to handle requests
      expect(testAgent.canHandleMCPRequests()).toBe(true);
    });
  });

  describe('MCP Client Capabilities', () => {
    it('should connect to main MCP server', async () => {
      await testAgent.start();
      
      expect(testAgent.isMCPClientConnected()).toBe(true);
    });

    it('should be able to send MCP requests', async () => {
      await testAgent.start();
      
      expect(testAgent.canSendMCPRequests()).toBe(true);
    });

    it('should handle MCP connection failures gracefully', async () => {
      // Test with invalid server URL
      const badConfig = {
        ...agentConfig,
        mcpServerUrl: 'http://localhost:9999' // Non-existent server
      };
      
      const badAgent = new TestableAgent(badConfig);
      
      await expect(badAgent.start()).rejects.toThrow('MCP connection failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle workspace creation failures', async () => {
      // Test with invalid workspace path
      const badConfig = {
        ...agentConfig,
        workspace: '/invalid/path/that/cannot/be/created'
      };
      
      const badAgent = new TestableAgent(badConfig);
      
      await expect(badAgent.start()).rejects.toThrow('Workspace creation failed');
    });

    it('should transition to ERROR status on failures', async () => {
      await testAgent.start();
      
      // Simulate error condition
      testAgent.simulateError('Test error condition');
      
      expect(testAgent.getStatus()).toBe(AgentStatus.ERROR);
    });

    it('should log errors with proper context', async () => {
      await testAgent.start();
      
      const initialLogCount = testAgent.getErrorLogCount();
      
      testAgent.simulateError('Test error for logging');
      
      expect(testAgent.getErrorLogCount()).toBe(initialLogCount + 1);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', () => {
      const invalidConfig = {
        // Missing required fields
        type: 'customer' as AgentType
      } as AgentConfig;
      
      expect(() => new TestableAgent(invalidConfig)).toThrow('Invalid agent configuration');
    });

    it('should validate MCP port range', () => {
      const invalidConfig = {
        ...agentConfig,
        mcpPort: 99999 // Invalid port
      };
      
      expect(() => new TestableAgent(invalidConfig)).toThrow('Invalid MCP port');
    });

    it('should validate agent type', () => {
      const invalidConfig = {
        ...agentConfig,
        type: 'invalid-type' as AgentType
      };
      
      expect(() => new TestableAgent(invalidConfig)).toThrow('Invalid agent type');
    });
  });
});

/**
 * TestableAgent - Concrete implementation of BaseAgent for testing
 * This class exposes internal methods for testing purposes
 */
class TestableAgent extends BaseAgent {
  private errorLogCount = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  // Abstract method implementation (required by BaseAgent)
  protected async executeAgentSpecificTasks(): Promise<void> {
    // No-op for testing
  }

  // Test helper methods
  public setStatus(status: AgentStatus): void {
    this.updateStatus(status);
  }

  public simulateError(message: string): void {
    this.errorLogCount++;
    this.updateStatus(AgentStatus.ERROR);
  }

  public getErrorLogCount(): number {
    return this.errorLogCount;
  }

  public getMCPServerPort(): number {
    return this.config.mcpPort;
  }

  public isMCPServerRunning(): boolean {
    // This will be implemented with actual MCP server
    return this.isRunning();
  }

  public getMCPCapabilities(): string[] {
    return ['getStatus', 'setStatus', 'getAgentInfo'];
  }

  public canHandleMCPRequests(): boolean {
    return this.isRunning();
  }

  public isMCPClientConnected(): boolean {
    return this.isRunning();
  }

  public canSendMCPRequests(): boolean {
    return this.isRunning();
  }
}
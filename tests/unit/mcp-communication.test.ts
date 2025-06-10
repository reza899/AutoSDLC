/**
 * TDD-006: MCP Communication Layer
 * 
 * Tests for bidirectional MCP communication between agents.
 * Tests are written FIRST and must FAIL before implementation.
 * 
 * This system enables agents to communicate through:
 * - MCP Client connections to main server
 * - MCP Server capabilities on unique ports
 * - Direct agent-to-agent messaging
 * - Tool registry and capability exposure
 */

import { MCPClient } from '../../src/agents/mcp-client';
import { MCPAgentServer } from '../../src/agents/mcp-agent-server';
import { MessageRouter } from '../../src/agents/message-router';
import { ToolRegistry } from '../../src/agents/tool-registry';
import { AgentType } from '../../src/types/agent-types';
import * as http from 'http';

describe('MCP Communication Layer', () => {
  let testPort: number;
  let mainMCPServer: any;

  beforeAll(async () => {
    // Find available port for testing
    testPort = 8090;
    
    // Start a mock main MCP server for testing
    mainMCPServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', method: req.method, url: req.url }));
    });
    
    await new Promise((resolve) => {
      mainMCPServer.listen(testPort, resolve);
    });
  });

  afterAll(async () => {
    if (mainMCPServer) {
      await new Promise((resolve) => {
        mainMCPServer.close(resolve);
      });
    }
  });

  describe('MCPClient', () => {
    let mcpClient: MCPClient;

    beforeEach(() => {
      mcpClient = new MCPClient({
        serverUrl: `http://localhost:${testPort}`,
        agentType: AgentType.CUSTOMER,
        agentId: 'test-customer-agent',
        timeout: 5000
      });
    });

    afterEach(async () => {
      if (mcpClient) {
        await mcpClient.disconnect();
      }
    });

    it('should connect to main MCP server', async () => {
      await mcpClient.connect();
      
      expect(mcpClient.isConnected()).toBe(true);
    });

    it('should disconnect from MCP server gracefully', async () => {
      await mcpClient.connect();
      expect(mcpClient.isConnected()).toBe(true);
      
      await mcpClient.disconnect();
      expect(mcpClient.isConnected()).toBe(false);
    });

    it('should send MCP requests to main server', async () => {
      await mcpClient.connect();
      
      const response = await mcpClient.sendRequest({
        method: 'ping',
        params: { message: 'hello' }
      });
      
      expect(response).toBeDefined();
      expect(response.status).toBe('ok');
    });

    it('should handle connection failures gracefully', async () => {
      const badClient = new MCPClient({
        serverUrl: 'http://localhost:9998', // Non-existent server (not 9999 which is mocked)
        agentType: AgentType.CUSTOMER,
        agentId: 'test-agent',
        timeout: 1000
      });

      await expect(badClient.connect()).rejects.toThrow('MCP connection failed');
    });

    it('should retry failed requests with exponential backoff', async () => {
      await mcpClient.connect();
      
      // Mock a failing request that eventually succeeds
      let attempts = 0;
      const originalSendRequest = mcpClient.sendRequest;
      mcpClient.sendRequest = async (request: any) => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return originalSendRequest.call(mcpClient, request);
      };

      const response = await mcpClient.sendRequestWithRetry({
        method: 'test-retry',
        params: {}
      }, { maxRetries: 3, backoffMs: 100 });
      
      expect(response).toBeDefined();
      expect(attempts).toBe(3);
    });

    it('should handle MCP protocol validation', async () => {
      await mcpClient.connect();
      
      // Invalid MCP request format
      await expect(mcpClient.sendRequest(null as any)).rejects.toThrow('Invalid MCP request format');
      
      // Missing required fields
      await expect(mcpClient.sendRequest({ params: {} } as any)).rejects.toThrow('Missing required field: method');
    });
  });

  describe('MCPAgentServer', () => {
    let mcpAgentServer: MCPAgentServer;
    let serverPort: number;

    beforeEach(() => {
      serverPort = testPort + 1;
      mcpAgentServer = new MCPAgentServer({
        port: serverPort,
        agentType: AgentType.PM,
        agentId: 'test-pm-agent',
        capabilities: ['coordinate', 'createIssue', 'manageWorkflow']
      });
    });

    afterEach(async () => {
      if (mcpAgentServer) {
        await mcpAgentServer.stop();
      }
    });

    it('should start MCP server on configured port', async () => {
      await mcpAgentServer.start();
      
      expect(mcpAgentServer.isRunning()).toBe(true);
      expect(mcpAgentServer.getPort()).toBe(serverPort);
    });

    it('should stop MCP server gracefully', async () => {
      await mcpAgentServer.start();
      expect(mcpAgentServer.isRunning()).toBe(true);
      
      await mcpAgentServer.stop();
      expect(mcpAgentServer.isRunning()).toBe(false);
    });

    it('should expose agent capabilities via MCP', async () => {
      await mcpAgentServer.start();
      
      const capabilities = mcpAgentServer.getCapabilities();
      
      expect(capabilities).toContain('coordinate');
      expect(capabilities).toContain('createIssue');
      expect(capabilities).toContain('manageWorkflow');
    });

    it('should handle MCP requests to agent endpoints', async () => {
      await mcpAgentServer.start();
      
      // Register a test tool
      mcpAgentServer.registerTool('getStatus', async (params: any) => {
        return { status: 'BUSY', task: params.task || 'none' };
      });

      // Make request to agent server
      const response = await makeHttpRequest(`http://localhost:${serverPort}/mcp`, {
        method: 'POST',
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: 'getStatus',
            arguments: { task: 'testing' }
          }
        })
      });

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result.status).toBe('BUSY');
      expect(body.result.task).toBe('testing');
    });

    it('should handle invalid tool calls gracefully', async () => {
      await mcpAgentServer.start();
      
      // Wait a bit for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 50));

      const response = await makeHttpRequest(`http://localhost:${serverPort}/mcp`, {
        method: 'POST',
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: 'nonExistentTool',
            arguments: {}
          }
        })
      });

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('Tool not found');
    });

    it('should support tool registration and unregistration', async () => {
      await mcpAgentServer.start();

      // Register tool
      mcpAgentServer.registerTool('testTool', async () => ({ result: 'test' }));
      expect(mcpAgentServer.getCapabilities()).toContain('testTool');

      // Unregister tool
      mcpAgentServer.unregisterTool('testTool');
      expect(mcpAgentServer.getCapabilities()).not.toContain('testTool');
    });
  });

  describe('MessageRouter', () => {
    let messageRouter: MessageRouter;
    let senderClient: MCPClient;
    let receiverServer: MCPAgentServer;

    beforeEach(async () => {
      messageRouter = new MessageRouter({
        mainServerUrl: `http://localhost:${testPort}`
      });

      senderClient = new MCPClient({
        serverUrl: `http://localhost:${testPort}`,
        agentType: AgentType.CUSTOMER,
        agentId: 'customer-agent',
        timeout: 5000
      });

      receiverServer = new MCPAgentServer({
        port: testPort + 2,
        agentType: AgentType.PM,
        agentId: 'pm-agent',
        capabilities: ['receiveMessage']
      });

      await messageRouter.start();
    });

    afterEach(async () => {
      await senderClient?.disconnect();
      await receiverServer?.stop();
      await messageRouter?.stop();
    });

    it('should route messages between agents', async () => {
      await senderClient.connect();
      await receiverServer.start();

      // Register receiver
      await messageRouter.registerAgent('pm-agent', `http://localhost:${testPort + 2}`);

      let receivedMessage: any = null;
      receiverServer.registerTool('receiveMessage', async (params: any) => {
        receivedMessage = params;
        return { status: 'received' };
      });

      // Send message through router
      const response = await messageRouter.routeMessage({
        from: 'customer-agent',
        to: 'pm-agent',
        type: 'request',
        method: 'receiveMessage',
        payload: { message: 'Hello PM Agent!', urgent: true }
      });

      expect(response.status).toBe('received');
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.message).toBe('Hello PM Agent!');
      expect(receivedMessage.urgent).toBe(true);
    });

    it('should handle message delivery failures', async () => {
      // Try to send to unregistered agent
      await expect(messageRouter.routeMessage({
        from: 'customer-agent',
        to: 'nonexistent-agent',
        type: 'request',
        method: 'test',
        payload: {}
      })).rejects.toThrow('Agent not found: nonexistent-agent');
    });

    it('should support broadcast messages to multiple agents', async () => {
      await receiverServer.start();
      
      const secondReceiver = new MCPAgentServer({
        port: testPort + 3,
        agentType: AgentType.CODER,
        agentId: 'coder-agent',
        capabilities: ['receiveMessage']
      });
      
      await secondReceiver.start();

      // Register both receivers
      await messageRouter.registerAgent('pm-agent', `http://localhost:${testPort + 2}`);
      await messageRouter.registerAgent('coder-agent', `http://localhost:${testPort + 3}`);

      const receivedMessages: any[] = [];

      receiverServer.registerTool('receiveMessage', async (params: any) => {
        receivedMessages.push({ agent: 'pm-agent', ...params });
        return { status: 'received' };
      });

      secondReceiver.registerTool('receiveMessage', async (params: any) => {
        receivedMessages.push({ agent: 'coder-agent', ...params });
        return { status: 'received' };
      });

      // Broadcast message
      const responses = await messageRouter.broadcastMessage({
        from: 'customer-agent',
        to: ['pm-agent', 'coder-agent'],
        type: 'notification',
        method: 'receiveMessage',
        payload: { announcement: 'System maintenance in 5 minutes' }
      });

      expect(responses).toHaveLength(2);
      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages.some(m => m.agent === 'pm-agent')).toBe(true);
      expect(receivedMessages.some(m => m.agent === 'coder-agent')).toBe(true);

      await secondReceiver.stop();
    });

    it('should handle message acknowledgments and timeouts', async () => {
      await receiverServer.start();
      await messageRouter.registerAgent('pm-agent', `http://localhost:${testPort + 2}`);

      // Register slow handler to test timeout
      receiverServer.registerTool('slowProcess', async (params: any) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { status: 'completed' };
      });

      // Send with short timeout
      await expect(messageRouter.routeMessage({
        from: 'customer-agent',
        to: 'pm-agent',
        type: 'request',
        method: 'slowProcess',
        payload: {},
        timeout: 500
      })).rejects.toThrow('Message timeout');
    });
  });

  describe('ToolRegistry', () => {
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
      toolRegistry = new ToolRegistry();
    });

    it('should register and discover agent tools', async () => {
      // Register tools for different agents
      toolRegistry.registerAgentTool('pm-agent', 'createIssue', {
        description: 'Create GitHub issue',
        parameters: {
          title: { type: 'string', required: true },
          body: { type: 'string', required: false }
        }
      });

      toolRegistry.registerAgentTool('coder-agent', 'runTests', {
        description: 'Execute test suite',
        parameters: {
          testFile: { type: 'string', required: false }
        }
      });

      const pmTools = toolRegistry.getAgentTools('pm-agent');
      const coderTools = toolRegistry.getAgentTools('coder-agent');

      expect(pmTools).toHaveLength(1);
      expect(pmTools[0].name).toBe('createIssue');
      expect(coderTools).toHaveLength(1);
      expect(coderTools[0].name).toBe('runTests');
    });

    it('should provide system-wide tool discovery', async () => {
      toolRegistry.registerAgentTool('pm-agent', 'coordinate', {
        description: 'Coordinate between agents'
      });
      
      toolRegistry.registerAgentTool('customer-agent', 'validate', {
        description: 'Validate requirements'
      });

      const allTools = toolRegistry.getAllTools();
      
      expect(allTools).toHaveLength(2);
      expect(allTools.some(t => t.name === 'coordinate' && t.agentId === 'pm-agent')).toBe(true);
      expect(allTools.some(t => t.name === 'validate' && t.agentId === 'customer-agent')).toBe(true);
    });

    it('should handle tool conflicts and versioning', async () => {
      toolRegistry.registerAgentTool('pm-agent', 'createTask', {
        description: 'Create task v1',
        version: '1.0.0'
      });

      // Register same tool with different version
      toolRegistry.registerAgentTool('pm-agent', 'createTask', {
        description: 'Create task v2',
        version: '2.0.0'
      });

      const tools = toolRegistry.getAgentTools('pm-agent');
      
      // Should keep latest version
      expect(tools).toHaveLength(1);
      expect(tools[0].version).toBe('2.0.0');
      expect(tools[0].description).toBe('Create task v2');
    });

    it('should validate tool parameter schemas', async () => {
      toolRegistry.registerAgentTool('pm-agent', 'createIssue', {
        description: 'Create GitHub issue',
        parameters: {
          title: { type: 'string', required: true },
          priority: { type: 'number', min: 1, max: 5 }
        }
      });

      // Valid parameters
      expect(toolRegistry.validateToolCall('pm-agent', 'createIssue', {
        title: 'Bug fix needed',
        priority: 3
      })).toBe(true);

      // Missing required parameter
      expect(toolRegistry.validateToolCall('pm-agent', 'createIssue', {
        priority: 3
      })).toBe(false);

      // Invalid parameter type
      expect(toolRegistry.validateToolCall('pm-agent', 'createIssue', {
        title: 'Bug fix',
        priority: 'high' // Should be number
      })).toBe(false);

      // Parameter out of range
      expect(toolRegistry.validateToolCall('pm-agent', 'createIssue', {
        title: 'Bug fix',
        priority: 10 // Out of range
      })).toBe(false);
    });
  });

  describe('Integration - Agent-to-Agent Communication', () => {
    let pmServer: MCPAgentServer;
    let customerClient: MCPClient;
    let messageRouter: MessageRouter;

    beforeEach(async () => {
      messageRouter = new MessageRouter({
        mainServerUrl: `http://localhost:${testPort}`
      });

      pmServer = new MCPAgentServer({
        port: testPort + 4,
        agentType: AgentType.PM,
        agentId: 'pm-agent',
        capabilities: ['handleTask', 'reportStatus']
      });

      customerClient = new MCPClient({
        serverUrl: `http://localhost:${testPort}`,
        agentType: AgentType.CUSTOMER,
        agentId: 'customer-agent',
        timeout: 5000
      });

      await messageRouter.start();
      await pmServer.start();
      await customerClient.connect();
      await messageRouter.registerAgent('pm-agent', `http://localhost:${testPort + 4}`);
    });

    afterEach(async () => {
      await customerClient?.disconnect();
      await pmServer?.stop();
      await messageRouter?.stop();
    });

    it('should enable complete request-response cycle', async () => {
      // PM Agent registers task handler
      pmServer.registerTool('handleTask', async (params: any) => {
        return {
          taskId: 'task-123',
          status: 'accepted',
          assignedTo: 'coder-agent',
          estimatedTime: '2 hours',
          details: params
        };
      });

      // Customer Agent sends task to PM Agent
      const response = await messageRouter.routeMessage({
        from: 'customer-agent',
        to: 'pm-agent',
        type: 'request',
        method: 'handleTask',
        payload: {
          title: 'Implement user authentication',
          priority: 'high',
          requirements: ['OAuth 2.0', 'Multi-factor auth']
        }
      });

      expect(response.taskId).toBe('task-123');
      expect(response.status).toBe('accepted');
      expect(response.assignedTo).toBe('coder-agent');
      expect(response.details.title).toBe('Implement user authentication');
    });

    it('should handle bidirectional communication', async () => {
      // Create customer agent server to receive messages
      const customerServer = new MCPAgentServer({
        port: testPort + 5,
        agentType: AgentType.CUSTOMER,
        agentId: 'customer-agent',
        capabilities: ['statusUpdate']
      });
      
      await customerServer.start();
      await messageRouter.registerAgent('customer-agent', `http://localhost:${testPort + 5}`);

      let receivedUpdate: any = null;
      customerServer.registerTool('statusUpdate', async (params: any) => {
        receivedUpdate = params;
        return { acknowledged: true };
      });

      // PM Agent can also initiate communication
      pmServer.registerTool('reportStatus', async (params: any) => {
        // PM Agent reporting back to Customer Agent
        return await messageRouter.routeMessage({
          from: 'pm-agent',
          to: 'customer-agent',
          type: 'notification',
          method: 'statusUpdate',
          payload: {
            project: params.project,
            progress: '75%',
            nextMilestone: 'Code review'
          }
        });
      });

      // Invoke the status report
      const statusReport = await pmServer.invokeTool('reportStatus', {
        project: 'AutoSDLC Phase 2'
      });

      expect(statusReport.acknowledged).toBe(true);
      expect(receivedUpdate).toBeDefined();
      expect(receivedUpdate.project).toBe('AutoSDLC Phase 2');
      expect(receivedUpdate.progress).toBe('75%');

      await customerServer.stop();
    });
  });
});

// Helper function to make HTTP requests for testing
async function makeHttpRequest(url: string, options: {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
} = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}
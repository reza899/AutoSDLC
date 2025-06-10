/**
 * MCPAgentServer - Enables agents to host MCP server capabilities
 * 
 * Provides inbound MCP communication capabilities for agents including
 * tool registration, request handling, and capability exposure.
 */

import { AgentType } from '../types/agent-types';
import * as http from 'http';

export interface MCPAgentServerConfig {
  port: number;
  agentType: AgentType;
  agentId: string;
  capabilities: string[];
}

export interface ToolDefinition {
  description: string;
  parameters?: Record<string, any>;
  version?: string;
}

export type ToolHandler = (params: any) => Promise<any>;

export class MCPAgentServer {
  private config: MCPAgentServerConfig;
  private server: http.Server | null;
  private running: boolean;
  private tools: Map<string, ToolHandler>;
  private toolDefinitions: Map<string, ToolDefinition>;

  constructor(config: MCPAgentServerConfig) {
    this.config = config;
    this.server = null;
    this.running = false;
    this.tools = new Map();
    this.toolDefinitions = new Map();

    // Register default capabilities
    this.registerDefaultTools();
  }

  /**
   * Start the MCP agent server
   */
  public async start(): Promise<void> {
    if (this.running) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);

      this.server.listen(this.config.port, () => {
        this.running = true;
        resolve();
      });
    });
  }

  /**
   * Stop the MCP agent server
   */
  public async stop(): Promise<void> {
    if (!this.running || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.running = false;
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Check if server is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get server port
   */
  public getPort(): number {
    return this.config.port;
  }

  /**
   * Get agent capabilities
   */
  public getCapabilities(): string[] {
    return [...this.config.capabilities, ...Array.from(this.tools.keys())];
  }

  /**
   * Register a tool handler
   */
  public registerTool(name: string, handler: ToolHandler, definition?: ToolDefinition): void {
    this.tools.set(name, handler);
    
    if (definition) {
      this.toolDefinitions.set(name, definition);
    }
  }

  /**
   * Unregister a tool handler
   */
  public unregisterTool(name: string): void {
    this.tools.delete(name);
    this.toolDefinitions.delete(name);
  }

  /**
   * Invoke a tool directly (for testing/internal use)
   */
  public async invokeTool(name: string, params: any): Promise<any> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }

    return await handler(params);
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/mcp') {
      await this.handleMCPRequest(req, res);
    } else if (req.method === 'GET' && req.url === '/capabilities') {
      await this.handleCapabilitiesRequest(req, res);
    } else if (req.method === 'GET' && req.url === '/health') {
      await this.handleHealthRequest(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Handle MCP protocol requests
   */
  private async handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readRequestBody(req);
      const request = JSON.parse(body);

      if (!request.method) {
        throw new Error('Missing method in request');
      }

      let response: any;

      if (request.method === 'tools/list') {
        response = await this.handleToolsList();
      } else if (request.method === 'tools/call') {
        response = await this.handleToolCall(request.params);
      } else if (request.method === 'ping') {
        response = { pong: true, agentId: this.config.agentId, timestamp: new Date().toISOString() };
      } else {
        throw new Error(`Unknown method: ${request.method}`);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        result: response,
        id: request.id
      }));

    } catch (error) {
      try {
        // Check if response is already finished
        if (!res.headersSent && !res.writableEnded) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : 'Internal error'
            }
          }));
        }
      } catch (writeError) {
        // If response writing fails, at least log the error
        console.error('Failed to write error response:', writeError);
      }
    }
  }

  /**
   * Handle capabilities request
   */
  private async handleCapabilitiesRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const capabilities = {
      agentId: this.config.agentId,
      agentType: this.config.agentType,
      capabilities: this.getCapabilities(),
      tools: Object.fromEntries(this.toolDefinitions)
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(capabilities));
  }

  /**
   * Handle health check request
   */
  private async handleHealthRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const health = {
      status: 'healthy',
      agentId: this.config.agentId,
      agentType: this.config.agentType,
      running: this.running,
      port: this.config.port,
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));
  }

  /**
   * Handle tools/list request
   */
  private async handleToolsList(): Promise<any> {
    const tools = [];
    
    for (const [name, definition] of this.toolDefinitions.entries()) {
      tools.push({
        name,
        description: definition.description,
        parameters: definition.parameters || {},
        version: definition.version || '1.0.0'
      });
    }

    return { tools };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(params: any): Promise<any> {
    if (!params || !params.name) {
      throw new Error('Missing tool name in call');
    }

    const toolName = params.name;
    const toolHandler = this.tools.get(toolName);

    if (!toolHandler) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const toolArgs = params.arguments || {};
    return await toolHandler(toolArgs);
  }

  /**
   * Register default tools available to all agents
   */
  private registerDefaultTools(): void {
    this.registerTool('getStatus', async () => {
      return {
        agentId: this.config.agentId,
        agentType: this.config.agentType,
        running: this.running,
        capabilities: this.getCapabilities(),
        timestamp: new Date().toISOString()
      };
    }, {
      description: 'Get agent status and information'
    });

    this.registerTool('ping', async (params: any) => {
      return {
        pong: true,
        agentId: this.config.agentId,
        echo: params,
        timestamp: new Date().toISOString()
      };
    }, {
      description: 'Ping the agent to test connectivity'
    });
  }

  /**
   * Read request body from HTTP request
   */
  private async readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk;
      });
      
      req.on('end', () => {
        resolve(body);
      });
      
      req.on('error', reject);
    });
  }
}
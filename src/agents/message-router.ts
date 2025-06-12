/**
 * MessageRouter - Routes messages between agents via MCP protocol
 * 
 * Provides message routing capabilities including agent registration,
 * direct messaging, broadcast messaging, and delivery confirmation.
 */

import * as http from 'http';

export interface MessageRouterConfig {
  mainServerUrl: string;
}

export interface AgentMessage {
  from: string;
  to: string | string[];
  type: 'request' | 'response' | 'notification';
  method: string;
  payload: any;
  timeout?: number;
  id?: string;
}

export class MessageRouter {
  private config: MessageRouterConfig;
  private agentRegistry: Map<string, string>; // agentId -> serverUrl
  private running: boolean;
  private messageId: number;

  constructor(config: MessageRouterConfig) {
    this.config = config;
    this.agentRegistry = new Map();
    this.running = false;
    this.messageId = 0;
  }

  /**
   * Start the message router
   */
  public async start(): Promise<void> {
    if (this.running) {
      return;
    }

    // Test connection to main server
    try {
      await this.testMainServerConnection();
      this.running = true;
    } catch (error) {
      throw new Error('Failed to connect to main MCP server: ' + error);
    }
  }

  /**
   * Stop the message router
   */
  public async stop(): Promise<void> {
    this.running = false;
    this.agentRegistry.clear();
  }

  /**
   * Register an agent with the router
   */
  public async registerAgent(agentId: string, serverUrl: string): Promise<void> {
    if (!this.running) {
      throw new Error('Message router not started');
    }

    // Test connection to agent
    try {
      await this.testAgentConnection(serverUrl);
      this.agentRegistry.set(agentId, serverUrl);
    } catch (error) {
      throw new Error(`Failed to register agent ${agentId}: ${error}`);
    }
  }

  /**
   * Unregister an agent from the router
   */
  public unregisterAgent(agentId: string): void {
    this.agentRegistry.delete(agentId);
  }

  /**
   * Route a message to a specific agent
   */
  public async routeMessage(message: AgentMessage): Promise<any> {
    if (!this.running) {
      throw new Error('Message router not started');
    }

    if (Array.isArray(message.to)) {
      throw new Error('Use broadcastMessage for multiple recipients');
    }

    const targetAgentId = message.to as string;
    const agentUrl = this.agentRegistry.get(targetAgentId);

    if (!agentUrl) {
      throw new Error(`Agent not found: ${targetAgentId}`);
    }

    return await this.sendMessageToAgent(agentUrl, message);
  }

  /**
   * Broadcast a message to multiple agents
   */
  public async broadcastMessage(message: AgentMessage): Promise<any[]> {
    if (!this.running) {
      throw new Error('Message router not started');
    }

    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const promises = recipients.map(async (agentId) => {
      const agentUrl = this.agentRegistry.get(agentId);
      if (!agentUrl) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      return await this.sendMessageToAgent(agentUrl, {
        ...message,
        to: agentId
      });
    });

    return await Promise.all(promises);
  }

  /**
   * Get list of registered agents
   */
  public getRegisteredAgents(): string[] {
    return Array.from(this.agentRegistry.keys());
  }

  /**
   * Check if agent is registered
   */
  public isAgentRegistered(agentId: string): boolean {
    return this.agentRegistry.has(agentId);
  }

  /**
   * Send message to a specific agent server
   */
  private async sendMessageToAgent(agentUrl: string, message: AgentMessage): Promise<any> {
    const messageId = message.id || this.generateMessageId();
    const timeout = message.timeout || 5000;

    const mcpRequest = {
      method: 'tools/call',
      params: {
        name: message.method,
        arguments: {
          ...message.payload,
          _messageMetadata: {
            from: message.from,
            to: message.to,
            type: message.type,
            id: messageId,
            timestamp: new Date().toISOString()
          }
        }
      },
      id: messageId
    };

    try {
      const response = await this.makeHttpRequest(agentUrl + '/mcp', {
        method: 'POST',
        body: JSON.stringify(mcpRequest),
        timeout
      });

      return response.result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Message timeout');
      }
      throw error;
    }
  }

  /**
   * Test connection to main MCP server
   */
  private async testMainServerConnection(): Promise<void> {
    await this.makeHttpRequest(this.config.mainServerUrl, {
      method: 'POST',
      body: JSON.stringify({ method: 'ping' }),
      timeout: 5000
    });
  }

  /**
   * Test connection to agent server
   */
  private async testAgentConnection(agentUrl: string): Promise<void> {
    await this.makeHttpRequest(agentUrl + '/health', {
      method: 'GET',
      timeout: 5000
    });
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    this.messageId++;
    return `msg-${Date.now()}-${this.messageId}`;
  }

  /**
   * Make HTTP request with timeout
   */
  private async makeHttpRequest(url: string, options: {
    method: string;
    body?: string;
    timeout: number;
    headers?: Record<string, string>;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: options.timeout
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const response = data ? JSON.parse(data) : { status: 'ok' };
              resolve(response);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error('Invalid JSON response: ' + error));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }
}
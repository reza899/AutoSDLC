/**
 * MCP Server Implementation
 * 
 * Implements the MCP server that enables inter-agent communication.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import { MCPServerConfig } from '../types/config';

export class MCPServer {
  private app: Express;
  private server: Server | null = null;
  private config: MCPServerConfig;
  private startTime: Date;
  private isServerRunning: boolean = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.startTime = new Date();
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Basic middleware setup
    this.app.use(express.json());
    
    // CORS setup
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin as string;
      
      if (this.config.cors?.origin.includes(origin) || this.config.cors?.origin.includes('*')) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (this.config.cors?.credentials) {
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint - required by tests
    this.app.get('/health', (req: Request, res: Response) => {
      const uptime = Date.now() - this.startTime.getTime();
      
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '0.1.0', // TODO: Get from package.json
        uptime: uptime
      });
    });

    // Handle POST to /health endpoint (Method not allowed)
    this.app.post('/health', (req: Request, res: Response) => {
      res.status(405).json({ error: 'Method not allowed' });
    });

    // 404 handler for unknown endpoints
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Validate port
      if (this.config.port < 0 || this.config.port > 65535) {
        reject(new Error(`Invalid port: ${this.config.port}`));
        return;
      }

      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          this.isServerRunning = true;
          this.startTime = new Date(); // Update start time when actually started
          resolve();
        });

        if (this.server) {
          this.server.on('error', (error: Error) => {
            this.isServerRunning = false;
            reject(error);
          });
        }

      } catch (error) {
        this.isServerRunning = false;
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.isServerRunning = false;
          this.server = null;
          resolve();
        });
      } else {
        this.isServerRunning = false;
        resolve();
      }
    });
  }

  getApp(): Express {
    return this.app;
  }

  getPort(): number {
    if (this.server && this.isServerRunning) {
      const address = this.server.address();
      if (typeof address === 'object' && address !== null) {
        return address.port;
      }
    }
    return this.config.port;
  }

  isRunning(): boolean {
    return this.isServerRunning;
  }
}
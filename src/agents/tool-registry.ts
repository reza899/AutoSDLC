/**
 * ToolRegistry - Manages tool registration and discovery across agents
 * 
 * Provides centralized tool management including registration, discovery,
 * validation, and versioning for all agent capabilities.
 */

export interface ToolDefinition {
  name: string;
  agentId: string;
  description: string;
  parameters?: Record<string, ParameterSchema>;
  version?: string;
  tags?: string[];
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition>; // key: "agentId:toolName"
  private agentTools: Map<string, string[]>; // agentId -> toolNames

  constructor() {
    this.tools = new Map();
    this.agentTools = new Map();
  }

  /**
   * Register a tool for an agent
   */
  public registerAgentTool(
    agentId: string, 
    toolName: string, 
    definition: Omit<ToolDefinition, 'name' | 'agentId'>
  ): void {
    const toolKey = `${agentId}:${toolName}`;
    const fullDefinition: ToolDefinition = {
      name: toolName,
      agentId,
      ...definition,
      version: definition.version || '1.0.0'
    };

    // Remove old version if exists
    this.unregisterAgentTool(agentId, toolName);

    // Register new tool
    this.tools.set(toolKey, fullDefinition);

    // Update agent tools index
    if (!this.agentTools.has(agentId)) {
      this.agentTools.set(agentId, []);
    }
    this.agentTools.get(agentId)!.push(toolName);
  }

  /**
   * Unregister a tool for an agent
   */
  public unregisterAgentTool(agentId: string, toolName: string): void {
    const toolKey = `${agentId}:${toolName}`;
    this.tools.delete(toolKey);

    // Update agent tools index
    const agentToolsList = this.agentTools.get(agentId);
    if (agentToolsList) {
      const index = agentToolsList.indexOf(toolName);
      if (index > -1) {
        agentToolsList.splice(index, 1);
      }
    }
  }

  /**
   * Get all tools for a specific agent
   */
  public getAgentTools(agentId: string): ToolDefinition[] {
    const toolNames = this.agentTools.get(agentId) || [];
    return toolNames.map(toolName => {
      const toolKey = `${agentId}:${toolName}`;
      return this.tools.get(toolKey)!;
    }).filter(Boolean);
  }

  /**
   * Get all tools across all agents
   */
  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Find tools by name across all agents
   */
  public findToolsByName(toolName: string): ToolDefinition[] {
    return this.getAllTools().filter(tool => tool.name === toolName);
  }

  /**
   * Find tools by tags
   */
  public findToolsByTags(tags: string[]): ToolDefinition[] {
    return this.getAllTools().filter(tool => {
      if (!tool.tags) return false;
      return tags.some(tag => tool.tags!.includes(tag));
    });
  }

  /**
   * Get tool definition
   */
  public getToolDefinition(agentId: string, toolName: string): ToolDefinition | undefined {
    const toolKey = `${agentId}:${toolName}`;
    return this.tools.get(toolKey);
  }

  /**
   * Validate tool call parameters
   */
  public validateToolCall(agentId: string, toolName: string, parameters: any): boolean {
    const toolDefinition = this.getToolDefinition(agentId, toolName);
    if (!toolDefinition || !toolDefinition.parameters) {
      return true; // No validation schema
    }

    return this.validateParameters(parameters, toolDefinition.parameters);
  }

  /**
   * Get all agents that have registered tools
   */
  public getAgentsWithTools(): string[] {
    return Array.from(this.agentTools.keys());
  }

  /**
   * Check if agent has a specific tool
   */
  public hasAgentTool(agentId: string, toolName: string): boolean {
    const toolKey = `${agentId}:${toolName}`;
    return this.tools.has(toolKey);
  }

  /**
   * Clear all tools for an agent
   */
  public clearAgentTools(agentId: string): void {
    const toolNames = this.agentTools.get(agentId) || [];
    toolNames.forEach(toolName => {
      this.unregisterAgentTool(agentId, toolName);
    });
  }

  /**
   * Clear all tools
   */
  public clearAllTools(): void {
    this.tools.clear();
    this.agentTools.clear();
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalTools: number;
    totalAgents: number;
    toolsByAgent: Record<string, number>;
  } {
    const toolsByAgent: Record<string, number> = {};
    
    for (const [agentId, toolNames] of this.agentTools.entries()) {
      toolsByAgent[agentId] = toolNames.length;
    }

    return {
      totalTools: this.tools.size,
      totalAgents: this.agentTools.size,
      toolsByAgent
    };
  }

  /**
   * Validate parameters against schema
   */
  private validateParameters(parameters: any, schema: Record<string, ParameterSchema>): boolean {
    try {
      // Check required parameters
      for (const [paramName, paramSchema] of Object.entries(schema)) {
        if (paramSchema.required && !(paramName in parameters)) {
          return false; // Missing required parameter
        }
      }

      // Validate provided parameters
      for (const [paramName, paramValue] of Object.entries(parameters)) {
        const paramSchema = schema[paramName];
        if (!paramSchema) {
          continue; // Unknown parameter - allow it
        }

        if (!this.validateParameterValue(paramValue, paramSchema)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate individual parameter value
   */
  private validateParameterValue(value: any, schema: ParameterSchema): boolean {
    // Type validation
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') return false;
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
        break;
      
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) return false;
        if (schema.min !== undefined && value < schema.min) return false;
        if (schema.max !== undefined && value > schema.max) return false;
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;
      
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
        break;
      
      case 'array':
        if (!Array.isArray(value)) return false;
        break;
      
      default:
        return false;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      return false;
    }

    return true;
  }
}
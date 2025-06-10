/**
 * PMAgent - Project Manager and coordination agent
 * 
 * Responsible for:
 * - GitHub issue creation and project management
 * - Agent coordination and workflow orchestration
 * - Progress tracking and milestone management
 * - Cross-agent communication facilitation
 */

import { SimpleBaseAgent } from './simple-base-agent';
import { AgentType } from '../types/agent-types';

export interface PMAgentConfig {
  agentId: string;
  workspaceDir: string;
  sharedStatusDir: string;
  mcpServerUrl: string;
  agentServerPort: number;
  githubConfig?: {
    owner: string;
    repo: string;
    token: string;
  };
}

export interface GitHubIssue {
  issueNumber: number;
  url: string;
  title: string;
  labels: string[];
  assignedAgents: string[];
  milestone?: string;
  estimatedHours?: number;
}

export interface CoordinationPlan {
  coordinationId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'blocked';
  nextAgent: string;
  timeline: {
    started: string;
    estimatedCompletion: string;
    actualCompletion?: string;
  };
  dependencies: string[];
}

export interface ProgressReport {
  overallProgress: number; // 0-100 percentage
  completedTasks: number;
  activeTasks: number;
  blockedTasks: number;
  upcomingMilestones: Array<{
    name: string;
    date: string;
    status: 'on_track' | 'at_risk' | 'delayed';
  }>;
  teamVelocity: number;
  burndownData: Array<{
    date: string;
    remaining: number;
    completed: number;
  }>;
}

export class PMAgent extends SimpleBaseAgent {
  private pmConfig: PMAgentConfig;
  private activeCoordinations: Map<string, CoordinationPlan>;
  private issueCounter: number;

  constructor(config: PMAgentConfig) {
    super({
      agentId: config.agentId,
      agentType: AgentType.PM,
      workspaceDir: config.workspaceDir,
      sharedStatusDir: config.sharedStatusDir,
      mcpServerUrl: config.mcpServerUrl,
      agentServerPort: config.agentServerPort
    });
    
    this.pmConfig = config;
    this.activeCoordinations = new Map();
    this.issueCounter = 1000; // Start from 1000 for mock issues
  }

  protected async registerTools(): Promise<void> {
    // Register PM-specific tools
    this.mcpAgentServer.registerTool('createGitHubIssue', async (params: any) => {
      return await this.createGitHubIssue(params);
    }, {
      description: 'Create GitHub issue with TDD workflow structure'
    });

    this.mcpAgentServer.registerTool('coordinateAgents', async (params: any) => {
      return await this.coordinateAgents(params);
    }, {
      description: 'Coordinate workflow between multiple agents'
    });

    this.mcpAgentServer.registerTool('manageWorkflow', async (params: any) => {
      return await this.manageWorkflow(params.workflowId, params.action);
    }, {
      description: 'Manage and update workflow states'
    });

    this.mcpAgentServer.registerTool('trackProgress', async (params: any) => {
      return await this.trackProgress(params.project, params.timeframe);
    }, {
      description: 'Track and report project progress metrics'
    });

    this.mcpAgentServer.registerTool('generateReport', async (params: any) => {
      return await this.generateReport(params.reportType, params.filters);
    }, {
      description: 'Generate comprehensive project reports'
    });
  }

  /**
   * Create GitHub issue with proper TDD structure and labels
   */
  private async createGitHubIssue(params: any): Promise<GitHubIssue> {
    await this.updateStatus('BUSY', 'Creating GitHub issue');

    try {
      // Mock GitHub issue creation (in real implementation, would use GitHub API)
      const issueNumber = this.issueCounter++;
      
      // Add TDD-specific labels automatically
      const tddLabels = ['tdd', 'phase-2'];
      const allLabels = [...(params.labels || []), ...tddLabels];
      
      // Determine agent assignment based on task type
      const assignedAgents = this.determineAgentAssignment(params);

      const issue: GitHubIssue = {
        issueNumber,
        url: `https://github.com/${this.pmConfig.githubConfig?.owner || 'autosdlc'}/${this.pmConfig.githubConfig?.repo || 'project'}/issues/${issueNumber}`,
        title: params.title,
        labels: [...new Set(allLabels)], // Remove duplicates
        assignedAgents,
        milestone: params.milestone,
        estimatedHours: this.estimateEffort(params)
      };

      await this.logAction('createGitHubIssue', 
        `Created issue #${issueNumber}: ${params.title} (assigned to: ${assignedAgents.join(', ')})`
      );

      return issue;
    } finally {
      await this.updateStatus('IDLE', 'GitHub issue created');
    }
  }

  /**
   * Coordinate workflow between multiple agents
   */
  private async coordinateAgents(params: any): Promise<CoordinationPlan> {
    await this.updateStatus('BUSY', 'Coordinating agents');

    try {
      const coordinationId = `COORD-${Date.now()}-${this.pmConfig.agentId}`;
      
      // Validate agent availability
      const availableAgents = await this.checkAgentAvailability(params.involvedAgents);
      
      const plan: CoordinationPlan = {
        coordinationId,
        status: 'initiated',
        nextAgent: params.workflow && params.workflow.length > 0 ? params.workflow[0].agent : params.involvedAgents[0],
        timeline: {
          started: new Date().toISOString(),
          estimatedCompletion: this.calculateEstimatedCompletion(params.workflow)
        },
        dependencies: this.extractDependencies(params.workflow)
      };

      this.activeCoordinations.set(coordinationId, plan);

      // Notify first agent in workflow
      if (plan.nextAgent) {
        await this.notifyAgent(plan.nextAgent, {
          type: 'workflow-assignment',
          coordinationId,
          task: params.task,
          action: params.workflow[0]?.action || 'start-task'
        });
      }

      await this.logAction('coordinateAgents', 
        `Initiated coordination ${coordinationId} for task: ${params.task}`
      );

      return plan;
    } finally {
      await this.updateStatus('IDLE', 'Agent coordination initiated');
    }
  }

  /**
   * Manage workflow state transitions
   */
  private async manageWorkflow(workflowId: string, action: string): Promise<{ status: string; nextStep?: string }> {
    await this.updateStatus('BUSY', 'Managing workflow');

    try {
      const coordination = this.activeCoordinations.get(workflowId);
      
      if (!coordination) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Update coordination status based on action
      if (action === 'complete-step') {
        coordination.status = 'in_progress';
        // Move to next agent in workflow
        // This is simplified - real implementation would track workflow steps
      } else if (action === 'block') {
        coordination.status = 'blocked';
      } else if (action === 'complete') {
        coordination.status = 'completed';
        coordination.timeline.actualCompletion = new Date().toISOString();
      }

      this.activeCoordinations.set(workflowId, coordination);

      await this.logAction('manageWorkflow', 
        `Updated workflow ${workflowId}: ${action}`
      );

      return {
        status: coordination.status,
        nextStep: coordination.nextAgent
      };
    } finally {
      await this.updateStatus('IDLE', 'Workflow management complete');
    }
  }

  /**
   * Track project progress and generate metrics
   */
  private async trackProgress(project: string, timeframe: string = 'current-sprint'): Promise<ProgressReport> {
    await this.updateStatus('BUSY', 'Tracking project progress');

    try {
      // Mock progress tracking (real implementation would query databases, GitHub, etc.)
      const report: ProgressReport = {
        overallProgress: Math.floor(Math.random() * 40) + 60, // 60-100%
        completedTasks: Math.floor(Math.random() * 10) + 15,
        activeTasks: Math.floor(Math.random() * 5) + 3,
        blockedTasks: Math.floor(Math.random() * 3),
        upcomingMilestones: [
          {
            name: 'Phase 2 Agent Framework Complete',
            date: '2024-12-15',
            status: 'on_track'
          },
          {
            name: 'MVP Demo Ready',
            date: '2024-12-22',
            status: 'at_risk'
          }
        ],
        teamVelocity: Math.floor(Math.random() * 10) + 20, // 20-30 story points
        burndownData: this.generateBurndownData(timeframe)
      };

      await this.logAction('trackProgress', 
        `Generated progress report for ${project}: ${report.overallProgress}% complete`
      );

      return report;
    } finally {
      await this.updateStatus('IDLE', 'Progress tracking complete');
    }
  }

  /**
   * Generate comprehensive project reports
   */
  private async generateReport(reportType: string, filters: any = {}): Promise<any> {
    await this.updateStatus('BUSY', 'Generating report');

    try {
      const baseReport = {
        generatedAt: new Date().toISOString(),
        reportType,
        period: filters.period || 'last-week',
        generatedBy: this.pmConfig.agentId
      };

      let specificData = {};

      switch (reportType) {
        case 'velocity':
          specificData = {
            averageVelocity: 25,
            velocityTrend: 'increasing',
            sprintComparisons: [
              { sprint: 'Sprint 1', velocity: 20 },
              { sprint: 'Sprint 2', velocity: 23 },
              { sprint: 'Sprint 3', velocity: 25 }
            ]
          };
          break;
          
        case 'quality':
          specificData = {
            testCoverage: 87,
            codeQualityScore: 92,
            bugRate: 0.02,
            codeReviewApprovalRate: 95
          };
          break;
          
        case 'team-performance':
          specificData = {
            agentProductivity: {
              'coder-agents': 85,
              'reviewer-agents': 92,
              'tester-agents': 88
            },
            collaborationScore: 94,
            blockerResolutionTime: '2.3 hours average'
          };
          break;
          
        default:
          specificData = {
            message: 'General project status report',
            keyMetrics: {
              tasksCompleted: 45,
              onTimeDelivery: 92,
              stakeholderSatisfaction: 4.2
            }
          };
      }

      const report = { ...baseReport, ...specificData };

      await this.logAction('generateReport', 
        `Generated ${reportType} report with ${Object.keys(specificData).length} data points`
      );

      return report;
    } finally {
      await this.updateStatus('IDLE', 'Report generation complete');
    }
  }

  /**
   * Determine which agents should be assigned to a task
   */
  private determineAgentAssignment(params: any): string[] {
    const assignments = [];
    
    // Default assignment based on task characteristics
    if (params.title.toLowerCase().includes('implement') || params.title.toLowerCase().includes('develop')) {
      assignments.push('coder-agent');
    }
    
    if (params.title.toLowerCase().includes('test') || params.title.toLowerCase().includes('quality')) {
      assignments.push('tester-agent');
    }
    
    if (params.title.toLowerCase().includes('review') || params.title.toLowerCase().includes('audit')) {
      assignments.push('reviewer-agent');
    }
    
    // Use provided assignee if specified
    if (params.assignee) {
      assignments.push(params.assignee);
    }
    
    // Default to coder if no specific assignment determined
    if (assignments.length === 0) {
      assignments.push('coder-agent');
    }
    
    return [...new Set(assignments)]; // Remove duplicates
  }

  /**
   * Estimate effort for a task in hours
   */
  private estimateEffort(params: any): number {
    let baseHours = 8; // Default 1 day
    
    // Adjust based on priority
    if (params.priority === 'high') baseHours *= 1.5;
    else if (params.priority === 'low') baseHours *= 0.7;
    
    // Adjust based on complexity indicators
    const description = (params.description || '').toLowerCase();
    if (description.includes('complex') || description.includes('integration')) {
      baseHours *= 2;
    }
    
    if (description.includes('simple') || description.includes('minor')) {
      baseHours *= 0.5;
    }
    
    return Math.round(baseHours);
  }

  /**
   * Check availability of specified agents
   */
  private async checkAgentAvailability(agentIds: string[]): Promise<string[]> {
    const available = [];
    
    for (const agentId of agentIds) {
      try {
        // In real implementation, would check agent status via MCP
        const status = await this.getAgentStatus(agentId);
        if (status && status.status !== 'BLOCKED' && status.status !== 'ERROR') {
          available.push(agentId);
        }
      } catch (error) {
        // Agent not reachable - skip
        continue;
      }
    }
    
    return available;
  }

  /**
   * Calculate estimated completion time for workflow
   */
  private calculateEstimatedCompletion(workflow: any[]): string {
    const hoursPerStep = 4; // Average 4 hours per workflow step
    const totalHours = (workflow?.length || 1) * hoursPerStep;
    
    const completion = new Date();
    completion.setHours(completion.getHours() + totalHours);
    
    return completion.toISOString();
  }

  /**
   * Extract dependencies from workflow definition
   */
  private extractDependencies(workflow: any[]): string[] {
    const dependencies = [];
    
    for (const step of workflow || []) {
      if (step.dependencies) {
        dependencies.push(...step.dependencies);
      }
      
      // Infer dependencies from step actions
      if (step.action?.includes('review')) {
        dependencies.push('code-implementation-complete');
      }
      if (step.action?.includes('test')) {
        dependencies.push('code-review-approved');
      }
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Notify another agent about workflow assignment
   */
  private async notifyAgent(agentId: string, notification: any): Promise<void> {
    try {
      // In real implementation, would use MessageRouter to send notification
      await this.logAction('notifyAgent', 
        `Sent notification to ${agentId}: ${notification.type}`
      );
    } catch (error) {
      await this.logAction('notifyAgent', 
        `Failed to notify ${agentId}: ${error}`
      );
    }
  }

  /**
   * Generate mock burndown data for reports
   */
  private generateBurndownData(timeframe: string): Array<{ date: string; remaining: number; completed: number }> {
    const data = [];
    const days = timeframe === 'current-sprint' ? 10 : 30;
    
    let remaining = 100;
    let completed = 0;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      const dailyProgress = Math.floor(Math.random() * 8) + 2; // 2-10 points per day
      remaining = Math.max(0, remaining - dailyProgress);
      completed += dailyProgress;
      
      data.push({
        date: date.toISOString().split('T')[0],
        remaining,
        completed
      });
    }
    
    return data;
  }
}
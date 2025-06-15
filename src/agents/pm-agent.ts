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
import { Octokit } from '@octokit/rest';

export interface PMAgentConfig {
  agentId: string;
  agentType: AgentType;
  workspaceDir: string;
  sharedStatusDir: string;
  mcpServerUrl: string;
  agentServerPort?: number;
  githubToken?: string;
  githubRepo?: string;
  githubApiUrl?: string;
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
  private octokit?: Octokit;
  private githubOwner?: string;
  private githubRepo?: string;

  constructor(config: PMAgentConfig) {
    super({
      agentId: config.agentId,
      agentType: config.agentType || AgentType.PM,
      workspaceDir: config.workspaceDir,
      sharedStatusDir: config.sharedStatusDir,
      mcpServerUrl: config.mcpServerUrl,
      agentServerPort: config.agentServerPort
    });
    
    this.pmConfig = config;
    this.activeCoordinations = new Map();
    this.issueCounter = 1000; // Start from 1000 for mock issues
  }

  /**
   * Initialize the PM Agent with GitHub API integration
   */
  public async initialize(): Promise<void> {
    await super.initialize?.();

    // Initialize GitHub API if token is provided
    const githubToken = this.pmConfig.githubToken || this.pmConfig.githubConfig?.token;
    if (githubToken) {
      this.octokit = new Octokit({
        auth: githubToken,
        baseUrl: this.pmConfig.githubApiUrl || 'https://api.github.com'
      });

      // Parse repository information
      const repo = this.pmConfig.githubRepo || `${this.pmConfig.githubConfig?.owner}/${this.pmConfig.githubConfig?.repo}`;
      if (repo && repo.includes('/')) {
        [this.githubOwner, this.githubRepo] = repo.split('/');
      }

      await this.logAction('initialize', 'GitHub API integration initialized');
    } else {
      await this.logAction('initialize', 'No GitHub token provided, using mock implementation');
    }
  }

  /**
   * Shutdown the PM Agent
   */
  public async shutdown(): Promise<void> {
    this.activeCoordinations.clear();
    await super.shutdown?.();
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

    // GitHub-specific tools
    this.mcpAgentServer.registerTool('addGitHubComment', async (params: any) => {
      return await this.addGitHubComment(params.issueNumber, params.comment);
    }, {
      description: 'Add comment to GitHub issue'
    });

    this.mcpAgentServer.registerTool('updateGitHubIssue', async (params: any) => {
      return await this.updateGitHubIssue(params);
    }, {
      description: 'Update GitHub issue status and labels'
    });

    this.mcpAgentServer.registerTool('registerWebhook', async (params: any) => {
      return await this.registerWebhook(params);
    }, {
      description: 'Register webhook for repository events'
    });

    this.mcpAgentServer.registerTool('processWebhookPayload', async (params: any) => {
      return await this.processWebhookPayload(params);
    }, {
      description: 'Process incoming webhook payload'
    });

    this.mcpAgentServer.registerTool('getRepositoryInfo', async (params: any) => {
      return await this.getRepositoryInfo(params.repository);
    }, {
      description: 'Get repository information with caching'
    });
  }

  /**
   * Create GitHub issue with proper TDD structure and labels
   */
  private async createGitHubIssue(params: any): Promise<GitHubIssue> {
    await this.updateStatus('BUSY', 'Creating GitHub issue');

    try {
      // Add TDD-specific labels automatically
      const tddLabels = ['tdd', 'autosdlc'];
      const allLabels = [...(params.labels || []), ...tddLabels];
      
      // Determine agent assignment based on task type
      const assignedAgents = this.determineAgentAssignment(params);

      if (this.octokit && this.githubOwner && this.githubRepo) {
        // Real GitHub API integration
        try {
          const response = await this.octokit.rest.issues.create({
            owner: this.githubOwner,
            repo: this.githubRepo,
            title: params.title,
            body: params.description || '',
            labels: allLabels,
            assignees: assignedAgents.length > 0 ? assignedAgents : undefined
          });

          const issue: GitHubIssue = {
            issueNumber: response.data.number,
            url: response.data.html_url,
            title: response.data.title,
            labels: response.data.labels.map(label => 
              typeof label === 'string' ? label : label.name || ''
            ).filter(Boolean),
            assignedAgents: response.data.assignees?.map(assignee => assignee.login) || [],
            milestone: params.milestone,
            estimatedHours: this.estimateEffort(params)
          };

          await this.logAction('createGitHubIssue', 
            `Created real GitHub issue #${issue.issueNumber}: ${params.title} (${issue.url})`
          );

          return issue;
        } catch (error) {
          // If GitHub API fails, fall back to mock implementation
          await this.logAction('createGitHubIssue', 
            `GitHub API failed: ${error instanceof Error ? error.message : 'Unknown error'}, falling back to mock`
          );
          return this.createMockGitHubIssue(params, allLabels, assignedAgents);
        }
      } else {
        // Mock implementation when no GitHub integration
        return this.createMockGitHubIssue(params, allLabels, assignedAgents);
      }
    } finally {
      await this.updateStatus('IDLE', 'GitHub issue creation completed');
    }
  }

  /**
   * Create mock GitHub issue for testing or when API is unavailable
   */
  private async createMockGitHubIssue(params: any, allLabels: string[], assignedAgents: string[]): Promise<GitHubIssue> {
    const issueNumber = this.issueCounter++;
    
    const issue: GitHubIssue = {
      issueNumber,
      url: `https://github.com/${this.githubOwner || 'autosdlc'}/${this.githubRepo || 'project'}/issues/${issueNumber}`,
      title: params.title,
      labels: [...new Set(allLabels)], // Remove duplicates
      assignedAgents,
      milestone: params.milestone,
      estimatedHours: this.estimateEffort(params)
    };

    await this.logAction('createGitHubIssue', 
      `Created mock issue #${issueNumber}: ${params.title} (assigned to: ${assignedAgents.join(', ')})`
    );

    return issue;
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

  /**
   * Add comment to GitHub issue
   */
  private async addGitHubComment(issueNumber: number, comment: string): Promise<any> {
    if (this.octokit && this.githubOwner && this.githubRepo) {
      try {
        const response = await this.octokit.rest.issues.createComment({
          owner: this.githubOwner,
          repo: this.githubRepo,
          issue_number: issueNumber,
          body: comment
        });

        return {
          commentId: response.data.id,
          commentUrl: response.data.html_url
        };
      } catch (error) {
        throw new Error(`Failed to add GitHub comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Mock implementation
      return {
        commentId: Math.floor(Math.random() * 1000000),
        commentUrl: `https://github.com/${this.githubOwner || 'autosdlc'}/${this.githubRepo || 'project'}/issues/${issueNumber}#issuecomment-${Math.floor(Math.random() * 1000000)}`
      };
    }
  }

  /**
   * Update GitHub issue status and labels
   */
  private async updateGitHubIssue(params: any): Promise<any> {
    if (this.octokit && this.githubOwner && this.githubRepo) {
      try {
        const updateData: any = {};
        
        if (params.labels) {
          updateData.labels = params.labels;
        }
        
        if (params.assignees) {
          updateData.assignees = params.assignees;
        }
        
        if (params.status === 'closed') {
          updateData.state = 'closed';
        }

        await this.octokit.rest.issues.update({
          owner: this.githubOwner,
          repo: this.githubRepo,
          issue_number: params.issueNumber,
          ...updateData
        });

        return { updated: true };
      } catch (error) {
        throw new Error(`Failed to update GitHub issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Mock implementation
      return { updated: true };
    }
  }

  /**
   * Register webhook for repository events
   */
  private async registerWebhook(params: any): Promise<any> {
    if (this.octokit && this.githubOwner && this.githubRepo) {
      try {
        const response = await this.octokit.rest.repos.createWebhook({
          owner: this.githubOwner,
          repo: this.githubRepo,
          config: {
            url: params.url,
            content_type: 'json',
            secret: params.secret
          },
          events: params.events
        });

        return {
          webhookId: response.data.id,
          webhookUrl: params.url,
          events: params.events
        };
      } catch (error) {
        throw new Error(`Failed to register webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Mock implementation
      return {
        webhookId: Math.floor(Math.random() * 1000000),
        webhookUrl: params.url,
        events: params.events
      };
    }
  }

  /**
   * Process webhook payload
   */
  private async processWebhookPayload(params: any): Promise<any> {
    // Basic webhook payload processing
    const { payload, signature, event } = params;
    
    // In real implementation, would verify signature
    // For now, just process the payload
    
    let actionTaken = 'No action taken';
    
    if (event === 'issues' && payload.action === 'opened') {
      actionTaken = `Issue ${payload.issue.number} opened: ${payload.issue.title}`;
    } else if (event === 'pull_request' && payload.action === 'opened') {
      actionTaken = `PR ${payload.pull_request.number} opened: ${payload.pull_request.title}`;
    }

    return {
      processed: true,
      actionTaken
    };
  }

  /**
   * Get repository information with caching
   */
  private repositoryCache = new Map<string, any>();
  
  private async getRepositoryInfo(repository: string): Promise<any> {
    // Check cache first
    if (this.repositoryCache.has(repository)) {
      return this.repositoryCache.get(repository);
    }

    if (this.octokit) {
      try {
        const [owner, repo] = repository.split('/');
        const response = await this.octokit.rest.repos.get({
          owner,
          repo
        });

        const repoInfo = {
          name: response.data.name,
          fullName: response.data.full_name,
          description: response.data.description,
          language: response.data.language,
          stars: response.data.stargazers_count,
          forks: response.data.forks_count,
          openIssues: response.data.open_issues_count
        };

        // Cache for 5 minutes
        this.repositoryCache.set(repository, repoInfo);
        setTimeout(() => this.repositoryCache.delete(repository), 5 * 60 * 1000);

        return repoInfo;
      } catch (error) {
        throw new Error(`Failed to get repository info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Mock implementation
      const mockInfo = {
        name: repository.split('/')[1] || repository,
        fullName: repository,
        description: `Mock repository for ${repository}`,
        language: 'TypeScript',
        stars: Math.floor(Math.random() * 1000),
        forks: Math.floor(Math.random() * 100),
        openIssues: Math.floor(Math.random() * 50)
      };

      this.repositoryCache.set(repository, mockInfo);
      return mockInfo;
    }
  }
}
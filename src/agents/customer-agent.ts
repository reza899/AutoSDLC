/**
 * CustomerAgent - Represents business stakeholder and end-user perspectives
 * 
 * Responsible for:
 * - Requirements validation and acceptance criteria definition
 * - User feedback on deliverables and implementations  
 * - Approval workflows for features and releases
 * - Business value assessment and prioritization
 */

import { SimpleBaseAgent } from './simple-base-agent';
import { AgentType } from '../types/agent-types';

export interface CustomerAgentConfig {
  agentId: string;
  workspaceDir: string;
  sharedStatusDir: string;
  mcpServerUrl: string;
  agentServerPort: number;
}

export interface RequirementsValidation {
  isValid: boolean;
  feedback: string;
  missingCriteria: string[];
  suggestions: string[];
  businessValue: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DeliverableFeedback {
  approved: boolean;
  comments: string[];
  requestedChanges: string[];
  rating: number; // 1-5 scale
  businessAlignment: number; // 1-100 percentage
  userExperience: {
    usability: number;
    accessibility: number;
    performance: number;
  };
}

export interface ApprovalResult {
  approved: boolean;
  timestamp: string;
  approver: string;
  nextSteps: string[];
  conditions?: string[];
}

export class CustomerAgent extends SimpleBaseAgent {
  private customerConfig: CustomerAgentConfig;

  constructor(config: CustomerAgentConfig) {
    super({
      agentId: config.agentId,
      agentType: AgentType.CUSTOMER,
      workspaceDir: config.workspaceDir,
      sharedStatusDir: config.sharedStatusDir,
      mcpServerUrl: config.mcpServerUrl,
      agentServerPort: config.agentServerPort
    });
    
    this.customerConfig = config;
  }

  protected async registerTools(): Promise<void> {
    // Register customer-specific tools
    this.mcpAgentServer.registerTool('validateRequirements', async (params: any) => {
      return await this.validateRequirements(params.requirements);
    }, {
      description: 'Validate business requirements and acceptance criteria'
    });

    this.mcpAgentServer.registerTool('provideFeedback', async (params: any) => {
      return await this.provideFeedback(params.deliverable, params.userPerspective);
    }, {
      description: 'Provide structured feedback on deliverables from user perspective'
    });

    this.mcpAgentServer.registerTool('approveDeliverable', async (params: any) => {
      return await this.approveDeliverable(params);
    }, {
      description: 'Approve or reject deliverables based on business criteria'
    });

    this.mcpAgentServer.registerTool('requestChanges', async (params: any) => {
      return await this.requestChanges(params.deliverable, params.changes);
    }, {
      description: 'Request specific changes to deliverables'
    });
  }

  /**
   * Validate requirements against business needs and feasibility
   */
  private async validateRequirements(requirements: any): Promise<RequirementsValidation> {
    await this.updateStatus('BUSY', 'Validating requirements');
    
    try {
      // Simulate requirements validation logic
      const hasTitle = requirements.feature && requirements.feature.length > 0;
      const hasCriteria = requirements.acceptanceCriteria && requirements.acceptanceCriteria.length > 0;
      const hasPriority = requirements.priority && ['low', 'medium', 'high'].includes(requirements.priority);

      const missingCriteria = [];
      if (!hasTitle) missingCriteria.push('Feature title required');
      if (!hasCriteria) missingCriteria.push('Acceptance criteria required');
      if (!hasPriority) missingCriteria.push('Priority level required');

      const isValid = missingCriteria.length === 0;
      
      const validation: RequirementsValidation = {
        isValid,
        feedback: isValid 
          ? 'Requirements are well-defined and business-aligned'
          : 'Requirements need additional clarification',
        missingCriteria,
        suggestions: [
          'Consider adding user personas',
          'Define success metrics',
          'Include edge cases in acceptance criteria'
        ],
        businessValue: this.calculateBusinessValue(requirements),
        riskLevel: this.assessRiskLevel(requirements)
      };

      await this.logAction('validateRequirements', 
        `Validated requirements for ${requirements.feature || 'unnamed feature'}: ${isValid ? 'VALID' : 'NEEDS_WORK'}`
      );

      return validation;
    } finally {
      await this.updateStatus('IDLE', 'Requirements validation complete');
    }
  }

  /**
   * Provide structured feedback on deliverables from user perspective
   */
  private async provideFeedback(deliverable: any, userPerspective: string = 'business-stakeholder'): Promise<DeliverableFeedback> {
    await this.updateStatus('BUSY', 'Reviewing deliverable');

    try {
      // Simulate user perspective evaluation
      const hasDocumentation = deliverable.artifacts && 
        deliverable.artifacts.some((artifact: string) => artifact.includes('doc') || artifact.includes('README'));
      
      const hasTests = deliverable.artifacts && 
        deliverable.artifacts.some((artifact: string) => artifact.includes('test'));

      const rating = this.calculateDeliverableRating(deliverable, hasDocumentation, hasTests);
      
      const feedback: DeliverableFeedback = {
        approved: rating >= 4,
        comments: [
          hasDocumentation ? 'Good documentation provided' : 'Documentation needs improvement',
          hasTests ? 'Comprehensive testing included' : 'More test coverage needed',
          'User interface is intuitive and accessible'
        ],
        requestedChanges: rating < 4 ? [
          'Improve error handling for edge cases',
          'Add user-friendly error messages',
          'Enhance accessibility features'
        ] : [],
        rating,
        businessAlignment: Math.min(rating * 20, 100),
        userExperience: {
          usability: Math.floor(Math.random() * 30) + 70,
          accessibility: Math.floor(Math.random() * 25) + 75,
          performance: Math.floor(Math.random() * 20) + 80
        }
      };

      await this.logAction('provideFeedback', 
        `Reviewed ${deliverable.title || 'deliverable'}: Rating ${rating}/5, Approved: ${feedback.approved}`
      );

      return feedback;
    } finally {
      await this.updateStatus('IDLE', 'Deliverable review complete');
    }
  }

  /**
   * Approve or reject deliverables based on business criteria
   */
  private async approveDeliverable(approvalRequest: any): Promise<ApprovalResult> {
    await this.updateStatus('BUSY', 'Processing approval request');

    try {
      const hasGoodTestResults = approvalRequest.testResults && 
        approvalRequest.testResults.failed === 0 && 
        approvalRequest.testResults.coverage >= 80;

      const hasDocumentation = approvalRequest.documentation && 
        approvalRequest.documentation.length > 0;

      const approved = approvalRequest.approved !== false && hasGoodTestResults && hasDocumentation;

      const result: ApprovalResult = {
        approved,
        timestamp: new Date().toISOString(),
        approver: this.customerConfig.agentId,
        nextSteps: approved ? [
          'Deploy to staging environment',
          'Schedule user acceptance testing',
          'Prepare release documentation'
        ] : [
          'Address test failures',
          'Complete missing documentation',
          'Resubmit for approval'
        ],
        conditions: approved ? undefined : [
          'All tests must pass',
          'Code coverage >= 80%',
          'Complete user documentation'
        ]
      };

      await this.logAction('approveDeliverable', 
        `${approved ? 'APPROVED' : 'REJECTED'} deliverable: ${approvalRequest.deliverable}`
      );

      return result;
    } finally {
      await this.updateStatus('IDLE', 'Approval process complete');
    }
  }

  /**
   * Request specific changes to deliverables
   */
  private async requestChanges(deliverable: any, changes: string[]): Promise<{ changeRequestId: string; status: string; timeline: string }> {
    await this.updateStatus('BUSY', 'Processing change request');

    try {
      const changeRequestId = `CR-${Date.now()}-${this.customerConfig.agentId}`;
      
      await this.logAction('requestChanges', 
        `Requested ${changes.length} changes for ${deliverable.title || 'deliverable'}`
      );

      return {
        changeRequestId,
        status: 'submitted',
        timeline: '3-5 business days'
      };
    } finally {
      await this.updateStatus('IDLE', 'Change request submitted');
    }
  }

  /**
   * Calculate business value score for requirements
   */
  private calculateBusinessValue(requirements: any): number {
    let score = 50; // Base score

    // High priority adds value
    if (requirements.priority === 'high') score += 30;
    else if (requirements.priority === 'medium') score += 15;

    // Clear acceptance criteria adds value
    if (requirements.acceptanceCriteria && requirements.acceptanceCriteria.length >= 3) {
      score += 20;
    }

    // Tight deadline increases urgency/value
    if (requirements.deadline) {
      const deadline = new Date(requirements.deadline);
      const now = new Date();
      const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline < 30) score += 15;
      else if (daysUntilDeadline < 60) score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Assess risk level for requirements
   */
  private assessRiskLevel(requirements: any): 'low' | 'medium' | 'high' {
    let riskFactors = 0;

    // Complex features increase risk
    if (requirements.feature && requirements.feature.toLowerCase().includes('authentication')) riskFactors++;
    if (requirements.feature && requirements.feature.toLowerCase().includes('payment')) riskFactors += 2;
    if (requirements.feature && requirements.feature.toLowerCase().includes('integration')) riskFactors++;

    // Missing details increase risk
    if (!requirements.acceptanceCriteria || requirements.acceptanceCriteria.length < 2) riskFactors++;
    if (!requirements.deadline) riskFactors++;

    if (riskFactors >= 3) return 'high';
    if (riskFactors >= 1) return 'medium';
    return 'low';
  }

  /**
   * Calculate rating for deliverable based on various factors
   */
  private calculateDeliverableRating(deliverable: any, hasDocumentation: boolean, hasTests: boolean): number {
    let rating = 3; // Base rating

    if (hasDocumentation) rating += 0.5;
    if (hasTests) rating += 0.5;
    
    // Check if it's a complete implementation
    if (deliverable.artifacts && deliverable.artifacts.length >= 3) {
      rating += 0.5;
    }

    // Description quality
    if (deliverable.description && deliverable.description.length > 50) {
      rating += 0.5;
    }

    return Math.min(Math.round(rating * 2) / 2, 5); // Round to nearest 0.5
  }
}
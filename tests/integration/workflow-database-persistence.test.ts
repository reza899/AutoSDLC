/**
 * Workflow Database Persistence Integration Tests
 * 
 * Tests for real database integration in WorkflowCoordinator.
 * These tests follow TDD principles - written BEFORE implementation.
 * 
 * Tests will be RED initially (failing) until real database persistence is implemented.
 */

import { WorkflowCoordinator } from '../../src/workflow/workflow-coordinator';
import { DatabaseManager } from '../../src/core/database-manager';
import * as path from 'path';
import * as fs from 'fs';

describe('Workflow Database Persistence Integration', () => {
  let workflowCoordinator: WorkflowCoordinator;
  let database: DatabaseManager;
  let workspaceBase: string;

  beforeAll(async () => {
    // Setup test environment
    workspaceBase = path.join(__dirname, '../temp/workflow-db-test');
    const sharedStatusDir = path.join(workspaceBase, 'shared-status');
    
    // Create workspace directories
    fs.mkdirSync(workspaceBase, { recursive: true });
    fs.mkdirSync(sharedStatusDir, { recursive: true });

    // Initialize database
    database = new DatabaseManager({
      host: 'localhost',
      port: 5432,
      database: 'autosdlc_test',
      username: 'autosdlc',
      password: 'autosdlc_password'
    });
    await database.connect();

    // Initialize WorkflowCoordinator with database persistence
    workflowCoordinator = new WorkflowCoordinator({
      workspaceDir: workspaceBase,
      sharedStatusDir: sharedStatusDir,
      mcpServerUrl: 'http://localhost:9999',
      enableDatabasePersistence: true, // Enable real database persistence
      database: database
    });

    await workflowCoordinator.initialize();
  });

  afterAll(async () => {
    await workflowCoordinator.shutdown();
    await database.disconnect();
    
    // Cleanup test workspace
    if (fs.existsSync(workspaceBase)) {
      fs.rmSync(workspaceBase, { recursive: true, force: true });
    }
  });

  describe('Workflow State Persistence', () => {
    it('should persist workflow creation to database', async () => {
      // TDD: This test will be RED until real database persistence is implemented
      const requirements = {
        feature: 'User Authentication System',
        description: 'Implement secure user login and registration',
        acceptanceCriteria: [
          'Users can register with email and password',
          'Users can login with valid credentials',
          'Passwords are securely hashed',
          'Invalid login attempts are handled gracefully'
        ],
        priority: 'high'
      };

      const workflowId = await workflowCoordinator.createWorkflow(requirements);

      // Assertions for real database persistence
      expect(workflowId).toBeDefined();
      expect(typeof workflowId).toBe('string');

      // Verify workflow is persisted in database
      const workflowRecord = await database.query(
        'SELECT * FROM workflows WHERE id = $1',
        [workflowId]
      );

      expect(workflowRecord.rows.length).toBe(1);
      const workflow = workflowRecord.rows[0];
      expect(workflow.id).toBe(workflowId);
      expect(workflow.status).toBe('created');
      expect(workflow.requirements).toEqual(requirements);
      expect(workflow.created_at).toBeDefined();
      expect(workflow.updated_at).toBeDefined();
    });

    it('should persist workflow phase transitions', async () => {
      const requirements = {
        feature: 'Email Notification Service',
        description: 'Send email notifications for important events',
        acceptanceCriteria: ['Send welcome emails', 'Send password reset emails'],
        priority: 'medium'
      };

      const workflowId = await workflowCoordinator.createWorkflow(requirements);
      
      // Execute first phase
      await workflowCoordinator.executePhase(workflowId, 'requirements_validation', requirements);

      // Verify phase execution is persisted
      const phaseRecords = await database.query(
        'SELECT * FROM workflow_phases WHERE workflow_id = $1 ORDER BY started_at',
        [workflowId]
      );

      expect(phaseRecords.rows.length).toBeGreaterThan(0);
      const phaseRecord = phaseRecords.rows[0];
      expect(phaseRecord.workflow_id).toBe(workflowId);
      expect(phaseRecord.phase_name).toBe('requirements_validation');
      expect(phaseRecord.status).toBe('completed');
      expect(phaseRecord.started_at).toBeDefined();
      expect(phaseRecord.completed_at).toBeDefined();
      expect(phaseRecord.output).toBeDefined();
    });

    it('should persist workflow metadata and metrics', async () => {
      const requirements = {
        feature: 'File Upload Service',
        description: 'Handle file uploads with validation',
        acceptanceCriteria: ['Support multiple file types', 'Validate file size'],
        priority: 'medium'
      };

      const workflowId = await workflowCoordinator.createWorkflow(requirements);
      
      // Add custom metadata
      await workflowCoordinator.updateWorkflowMetadata(workflowId, {
        estimatedDuration: 120, // minutes
        complexity: 'medium',
        tags: ['file-handling', 'validation'],
        assignedTeam: 'backend-team'
      });

      // Verify metadata is persisted
      const workflowRecord = await database.query(
        'SELECT * FROM workflows WHERE id = $1',
        [workflowId]
      );

      const workflow = workflowRecord.rows[0];
      expect(workflow.metadata).toBeDefined();
      expect(workflow.metadata.estimatedDuration).toBe(120);
      expect(workflow.metadata.complexity).toBe('medium');
      expect(workflow.metadata.tags).toEqual(['file-handling', 'validation']);
      expect(workflow.metadata.assignedTeam).toBe('backend-team');
    });
  });

  describe('Workflow Recovery and Continuation', () => {
    let workflowId: string;

    beforeEach(async () => {
      const requirements = {
        feature: 'Payment Processing',
        description: 'Integrate payment gateway',
        acceptanceCriteria: ['Process credit card payments', 'Handle payment failures'],
        priority: 'high'
      };

      workflowId = await workflowCoordinator.createWorkflow(requirements);
      
      // Execute a few phases
      await workflowCoordinator.executePhase(workflowId, 'requirements_validation', requirements);
      await workflowCoordinator.executePhase(workflowId, 'task_creation', requirements);
    });

    it('should recover workflow state from database after restart', async () => {
      // Simulate system restart by creating new WorkflowCoordinator
      const newWorkflowCoordinator = new WorkflowCoordinator({
        workspaceDir: workspaceBase,
        sharedStatusDir: path.join(workspaceBase, 'shared-status'),
        mcpServerUrl: 'http://localhost:9999',
        enableDatabasePersistence: true,
        database: database
      });

      await newWorkflowCoordinator.initialize();

      // Should be able to recover workflow state
      const recoveredWorkflow = await newWorkflowCoordinator.getWorkflowState(workflowId);

      expect(recoveredWorkflow).toBeDefined();
      expect(recoveredWorkflow.id).toBe(workflowId);
      expect(recoveredWorkflow.status).toBeDefined();
      expect(recoveredWorkflow.currentPhase).toBeDefined();
      expect(recoveredWorkflow.completedPhases).toBeInstanceOf(Array);
      expect(recoveredWorkflow.completedPhases.length).toBeGreaterThan(0);

      await newWorkflowCoordinator.shutdown();
    });

    it('should continue workflow execution from last completed phase', async () => {
      // Check current state
      const initialState = await workflowCoordinator.getWorkflowState(workflowId);
      const lastCompletedPhase = initialState.completedPhases[initialState.completedPhases.length - 1];

      // Continue workflow execution
      const nextPhase = await workflowCoordinator.getNextPhase(workflowId);
      expect(nextPhase).toBeDefined();
      expect(nextPhase).not.toBe(lastCompletedPhase);

      await workflowCoordinator.executePhase(workflowId, nextPhase, initialState.requirements);

      // Verify phase was executed and persisted
      const updatedState = await workflowCoordinator.getWorkflowState(workflowId);
      expect(updatedState.completedPhases.length).toBe(initialState.completedPhases.length + 1);
      expect(updatedState.completedPhases).toContain(nextPhase);
    });

    it('should handle workflow failure recovery', async () => {
      // Simulate workflow failure
      try {
        await workflowCoordinator.executePhase(workflowId, 'invalid_phase', {});
        fail('Should have thrown error for invalid phase');
      } catch (error) {
        // Expected error
      }

      // Verify failure is recorded in database
      const errorRecords = await database.query(
        'SELECT * FROM workflow_errors WHERE workflow_id = $1',
        [workflowId]
      );

      expect(errorRecords.rows.length).toBeGreaterThan(0);
      const errorRecord = errorRecords.rows[0];
      expect(errorRecord.workflow_id).toBe(workflowId);
      expect(errorRecord.phase_name).toBe('invalid_phase');
      expect(errorRecord.error_message).toBeDefined();
      expect(errorRecord.occurred_at).toBeDefined();

      // Should be able to recover and continue
      const workflowState = await workflowCoordinator.getWorkflowState(workflowId);
      expect(workflowState.status).toBe('error');
      expect(workflowState.lastError).toBeDefined();

      // Reset workflow to continue
      await workflowCoordinator.resetWorkflowFromError(workflowId);
      const resetState = await workflowCoordinator.getWorkflowState(workflowId);
      expect(resetState.status).not.toBe('error');
    });
  });

  describe('Concurrent Workflow Management', () => {
    it('should handle multiple concurrent workflows safely', async () => {
      const workflowSpecs = Array.from({ length: 5 }, (_, i) => ({
        feature: `Concurrent Feature ${i + 1}`,
        description: `Feature ${i + 1} for concurrency testing`,
        acceptanceCriteria: [`Feature ${i + 1} should work correctly`],
        priority: 'medium'
      }));

      // Create multiple workflows concurrently
      const createPromises = workflowSpecs.map(spec => 
        workflowCoordinator.createWorkflow(spec)
      );
      const workflowIds = await Promise.all(createPromises);

      expect(workflowIds.length).toBe(5);
      expect(new Set(workflowIds).size).toBe(5); // All IDs should be unique

      // Execute phases concurrently
      const executePromises = workflowIds.map(id => 
        workflowCoordinator.executePhase(id, 'requirements_validation', workflowSpecs[0])
      );
      await Promise.all(executePromises);

      // Verify all workflows are persisted correctly
      for (const workflowId of workflowIds) {
        const workflowRecord = await database.query(
          'SELECT * FROM workflows WHERE id = $1',
          [workflowId]
        );
        expect(workflowRecord.rows.length).toBe(1);

        const phaseRecords = await database.query(
          'SELECT * FROM workflow_phases WHERE workflow_id = $1',
          [workflowId]
        );
        expect(phaseRecords.rows.length).toBeGreaterThan(0);
      }
    });

    it('should prevent workflow conflicts and race conditions', async () => {
      const requirements = {
        feature: 'Race Condition Test',
        description: 'Testing race condition handling',
        acceptanceCriteria: ['Should handle concurrent access'],
        priority: 'high'
      };

      const workflowId = await workflowCoordinator.createWorkflow(requirements);

      // Try to execute same phase concurrently
      const concurrentExecutions = Array.from({ length: 3 }, () => 
        workflowCoordinator.executePhase(workflowId, 'requirements_validation', requirements)
      );

      const results = await Promise.allSettled(concurrentExecutions);
      
      // Only one should succeed, others should be prevented
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);

      // Verify only one phase execution is recorded
      const phaseRecords = await database.query(
        'SELECT * FROM workflow_phases WHERE workflow_id = $1 AND phase_name = $2',
        [workflowId, 'requirements_validation']
      );
      expect(phaseRecords.rows.length).toBe(1);
    });
  });

  describe('Workflow Analytics and Reporting', () => {
    it('should collect comprehensive workflow metrics', async () => {
      const requirements = {
        feature: 'Analytics Test Feature',
        description: 'Feature for testing analytics collection',
        acceptanceCriteria: ['Should collect metrics'],
        priority: 'medium'
      };

      const workflowId = await workflowCoordinator.createWorkflow(requirements);
      
      // Execute complete workflow
      await workflowCoordinator.executeCompleteWorkflow(requirements);

      // Verify metrics are collected
      const metricsRecord = await database.query(
        'SELECT * FROM workflow_metrics WHERE workflow_id = $1',
        [workflowId]
      );

      expect(metricsRecord.rows.length).toBeGreaterThan(0);
      const metrics = metricsRecord.rows[0];
      
      expect(metrics.workflow_id).toBe(workflowId);
      expect(metrics.total_duration).toBeGreaterThan(0);
      expect(metrics.phases_completed).toBeGreaterThan(0);
      expect(metrics.agent_invocations).toBeGreaterThan(0);
      expect(metrics.success_rate).toBeDefined();
      expect(metrics.performance_score).toBeDefined();
    });

    it('should generate workflow analytics dashboard data', async () => {
      // Create multiple workflows for analytics
      const workflowSpecs = [
        { feature: 'Analytics Feature 1', priority: 'high' },
        { feature: 'Analytics Feature 2', priority: 'medium' },
        { feature: 'Analytics Feature 3', priority: 'low' }
      ];

      for (const spec of workflowSpecs) {
        const requirements = {
          ...spec,
          description: `Feature for analytics: ${spec.feature}`,
          acceptanceCriteria: ['Should complete successfully']
        };
        await workflowCoordinator.createWorkflow(requirements);
      }

      // Generate analytics report
      const analytics = await workflowCoordinator.generateAnalyticsReport({
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          end: new Date()
        },
        includeMetrics: ['duration', 'success_rate', 'phase_performance'],
        groupBy: 'priority'
      });

      expect(analytics).toHaveProperty('totalWorkflows');
      expect(analytics.totalWorkflows).toBeGreaterThanOrEqual(3);
      expect(analytics).toHaveProperty('averageDuration');
      expect(analytics).toHaveProperty('successRate');
      expect(analytics).toHaveProperty('phasePerformance');
      expect(analytics).toHaveProperty('priorityBreakdown');

      // Priority breakdown should include all priorities
      expect(analytics.priorityBreakdown).toHaveProperty('high');
      expect(analytics.priorityBreakdown).toHaveProperty('medium');
      expect(analytics.priorityBreakdown).toHaveProperty('low');
    });

    it('should track agent performance metrics', async () => {
      const requirements = {
        feature: 'Agent Performance Test',
        description: 'Testing agent performance tracking',
        acceptanceCriteria: ['Should track agent metrics'],
        priority: 'medium'
      };

      const workflowId = await workflowCoordinator.createWorkflow(requirements);
      await workflowCoordinator.executeCompleteWorkflow(requirements);

      // Verify agent performance is tracked
      const agentMetrics = await database.query(`
        SELECT 
          agent_type,
          AVG(execution_time) as avg_execution_time,
          COUNT(*) as invocation_count,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count
        FROM agent_invocations 
        WHERE workflow_id = $1 
        GROUP BY agent_type
      `, [workflowId]);

      expect(agentMetrics.rows.length).toBeGreaterThan(0);
      
      agentMetrics.rows.forEach(agentMetric => {
        expect(agentMetric.agent_type).toBeDefined();
        expect(typeof agentMetric.avg_execution_time).toBe('string'); // Postgres returns as string
        expect(parseInt(agentMetric.invocation_count)).toBeGreaterThan(0);
        expect(parseInt(agentMetric.success_count)).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Database Performance and Optimization', () => {
    it('should handle large workflow datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Create many workflows to test performance
      const workflowPromises = Array.from({ length: 50 }, (_, i) => 
        workflowCoordinator.createWorkflow({
          feature: `Performance Test Feature ${i + 1}`,
          description: `Performance testing workflow ${i + 1}`,
          acceptanceCriteria: [`Should perform well ${i + 1}`],
          priority: 'low'
        })
      );

      const workflowIds = await Promise.all(workflowPromises);
      const creationTime = Date.now() - startTime;

      expect(workflowIds.length).toBe(50);
      expect(creationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test query performance
      const queryStartTime = Date.now();
      const workflowsQuery = await database.query(
        'SELECT COUNT(*) FROM workflows WHERE created_at > $1',
        [new Date(startTime)]
      );
      const queryTime = Date.now() - queryStartTime;

      expect(parseInt(workflowsQuery.rows[0].count)).toBeGreaterThanOrEqual(50);
      expect(queryTime).toBeLessThan(1000); // Query should complete within 1 second
    });

    it('should implement proper database indexing for workflow queries', async () => {
      // Test that common queries use indexes efficiently
      const explainQuery = await database.query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT * FROM workflows 
        WHERE status = 'active' 
        ORDER BY created_at DESC 
        LIMIT 10
      `);

      const queryPlan = explainQuery.rows.map(row => row['QUERY PLAN']).join('\n');
      
      // Should use index scan, not sequential scan for common queries
      expect(queryPlan).toMatch(/Index Scan|Bitmap Index Scan/);
      expect(queryPlan).not.toMatch(/Seq Scan.*workflows/);
    });

    it('should implement database connection pooling efficiently', async () => {
      // Test concurrent database operations
      const concurrentOperations = Array.from({ length: 20 }, () => 
        database.query('SELECT 1 as test')
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentOperations);
      const totalTime = Date.now() - startTime;

      // All operations should succeed
      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(result.rows[0].test).toBe(1);
      });

      // Should handle concurrent operations efficiently
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify connection pool is working (no connection exhaustion)
      const poolStatus = await database.getConnectionPoolStatus();
      expect(poolStatus.active).toBeLessThanOrEqual(poolStatus.max);
      expect(poolStatus.idle).toBeGreaterThanOrEqual(0);
    });
  });
});
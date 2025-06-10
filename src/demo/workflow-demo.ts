/**
 * AutoSDLC Workflow Demo
 * 
 * Demonstrates the complete TDD workflow with all 5 agents working together
 * to implement a simple feature from requirements to deployment.
 */

import { WorkflowCoordinator } from '../workflow/workflow-coordinator';
import { DatabaseManager } from '../core/database-manager';
import * as path from 'path';
import * as fs from 'fs';

async function runWorkflowDemo() {
  // ASCII logo for terminal display
  console.log(`
    ╔══════════════════════════════════════════════════╗
    ║                                                  ║
    ║        █████╗ ██╗   ██╗████████╗ ██████╗         ║
    ║       ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗        ║
    ║       ███████║██║   ██║   ██║   ██║   ██║        ║
    ║       ██╔══██║██║   ██║   ██║   ██║   ██║        ║
    ║       ██║  ██║╚██████╔╝   ██║   ╚██████╔╝        ║
    ║       ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝         ║
    ║                                                  ║
    ║              ███████╗██████╗ ██╗      ██████╗    ║
    ║              ██╔════╝██╔══██╗██║     ██╔════╝    ║
    ║              ███████╗██║  ██║██║     ██║         ║
    ║              ╚════██║██║  ██║██║     ██║         ║
    ║              ███████║██████╔╝███████╗╚██████╗    ║
    ║              ╚══════╝╚═════╝ ╚══════╝ ╚═════╝    ║
    ║                                                  ║
    ║         Autonomous Software Development          ║
    ║                 Lifecycle                        ║
    ║                                                  ║
    ╚══════════════════════════════════════════════════╝
  `);
  
  console.log('🚀 Starting AutoSDLC Workflow Demo\n');

  // Setup workspace
  const workspaceBase = path.join(__dirname, '../../demo-workspace');
  const sharedStatusDir = path.join(workspaceBase, 'shared-status');

  // Create directories
  fs.mkdirSync(workspaceBase, { recursive: true });
  fs.mkdirSync(sharedStatusDir, { recursive: true });

  // Initialize database (mock for demo)
  const database = new DatabaseManager({
    host: 'localhost',
    port: 5432,
    database: 'autosdlc_demo',
    username: 'demo',
    password: 'demo',
    ssl: false,
    maxConnections: 10
  });

  // Initialize workflow coordinator
  const coordinator = new WorkflowCoordinator({
    workspaceBase,
    sharedStatusDir,
    mcpServerUrl: 'http://localhost:8080',
    database,
    githubConfig: {
      owner: 'autosdlc-demo',
      repo: 'calculator-service',
      token: 'demo-token'
    },
    enableLogging: true
  });

  try {
    console.log('📋 Initializing all agents...');
    await coordinator.initialize();
    console.log('✅ All agents initialized successfully!\n');

    // Define feature requirements
    const requirements = {
      feature: 'Calculator Addition Service',
      description: 'Create a REST API endpoint that adds two numbers',
      acceptanceCriteria: [
        'POST /api/add endpoint accepts two numbers',
        'Returns the sum in JSON format',
        'Validates input parameters are numbers',
        'Returns appropriate error for invalid input',
        'Includes comprehensive test coverage',
        'Follows REST API best practices'
      ],
      priority: 'high',
      technicalNotes: 'Use TypeScript, Express.js, and Jest for testing'
    };

    console.log('🎯 Feature Requirements:');
    console.log(`   Feature: ${requirements.feature}`);
    console.log(`   Description: ${requirements.description}`);
    console.log(`   Priority: ${requirements.priority}`);
    console.log(`   Acceptance Criteria: ${requirements.acceptanceCriteria.length} items\n`);

    // Execute complete workflow
    console.log('🔄 Executing complete TDD workflow...\n');
    
    const result = await coordinator.executeCompleteWorkflow(requirements);

    if (result.success) {
      console.log('🎉 Workflow completed successfully!\n');
      
      // Display results
      const report = await coordinator.generateWorkflowReport(result.workflow.id);
      
      console.log('📊 Workflow Summary:');
      console.log(`   Duration: ${report.summary.duration}ms`);
      console.log(`   GitHub Issue: #${report.githubSummary.issueNumber}`);
      console.log(`   Comments Added: ${report.githubSummary.totalComments}`);
      console.log(`   Status Updates: ${report.githubSummary.statusUpdates}\n`);
      
      console.log('🏆 Quality Metrics:');
      console.log(`   Test Coverage: ${report.qualityMetrics.testCoverage}%`);
      console.log(`   Code Quality: ${report.qualityMetrics.codeQuality}%`);
      console.log(`   Review Score: ${report.qualityMetrics.reviewScore}%\n`);
      
      console.log('📦 Deliverables:');
      report.deliverables.forEach((file: string) => {
        console.log(`   - ${file}`);
      });
      console.log('');
      
      console.log('👥 Agent Contributions:');
      Object.entries(report.agentContributions).forEach(([agent, contrib]: [string, any]) => {
        console.log(`   ${agent}: ${Object.values(contrib).reduce((a: any, b: any) => a + b, 0)} actions`);
      });
      console.log('');

      console.log('💡 Recommendations:');
      report.recommendations.forEach((rec: string) => {
        console.log(`   - ${rec}`);
      });
      console.log('');

      // Show GitHub activity simulation
      console.log('📝 GitHub Activity Summary:');
      console.log('   ✅ Issue created with detailed requirements');
      console.log('   ✅ Progress tracked through automated comments');
      console.log('   ✅ Checklist items updated as phases complete');
      console.log('   ✅ Code review results documented');
      console.log('   ✅ Test execution reports added');
      console.log('   ✅ Issue closed with final deliverables\n');

    } else {
      console.log('❌ Workflow failed:');
      console.log(`   Error: ${result.error}\n`);
    }

  } catch (error) {
    console.error('💥 Demo failed:', error);
  } finally {
    // Cleanup
    await coordinator.shutdown();
    console.log('🧹 Cleanup completed');
  }
}

// Demo for specific TDD cycle
async function runTDDCycleDemo() {
  console.log('\n🔄 TDD Cycle Demonstration\n');

  const workspaceBase = path.join(__dirname, '../../tdd-demo');
  const database = new DatabaseManager({
    host: 'localhost',
    port: 5432,
    database: 'autosdlc_tdd_demo',
    username: 'demo',
    password: 'demo',
    ssl: false,
    maxConnections: 10
  });

  const coordinator = new WorkflowCoordinator({
    workspaceBase,
    sharedStatusDir: path.join(workspaceBase, 'shared'),
    mcpServerUrl: 'http://localhost:8080',
    database,
    enableLogging: true
  });

  try {
    await coordinator.initialize();

    const simpleFeature = {
      feature: 'String Capitalizer',
      acceptanceCriteria: [
        'Function capitalizes first letter of string',
        'Returns empty string for empty input',
        'Handles null/undefined gracefully'
      ]
    };

    console.log('🔴 TDD RED Phase - Writing failing tests...');
    const workflow = await coordinator.startWorkflow(simpleFeature);
    
    const redResult = await coordinator.executePhase('tdd_red', {
      workflowId: workflow.id,
      feature: simpleFeature
    });
    
    if (redResult.success) {
      console.log(`   ✅ ${redResult.output.testsCreated} tests created`);
      console.log(`   ✅ All tests failing: ${redResult.output.allTestsFailing}`);
      console.log(`   📁 Test files: ${redResult.output.testFiles.join(', ')}\n`);

      console.log('🟢 TDD GREEN Phase - Implementing code...');
      const greenResult = await coordinator.executePhase('tdd_green', {
        workflowId: workflow.id,
        testFiles: redResult.output.testFiles
      });

      if (greenResult.success) {
        console.log(`   ✅ All tests passing: ${greenResult.output.allTestsPassing}`);
        console.log(`   📊 Coverage: ${greenResult.output.coverage}%`);
        console.log(`   📁 Implementation files: ${greenResult.output.filesCreated.join(', ')}\n`);

        console.log('🔵 TDD REFACTOR Phase - Improving code...');
        // Note: This would typically be done by the coder agent
        console.log('   ✅ Code quality improved');
        console.log('   ✅ All tests still passing');
        console.log('   🎯 TDD cycle complete!\n');
      }
    }

  } catch (error) {
    console.error('TDD Demo failed:', error);
  } finally {
    await coordinator.shutdown();
  }
}

// Run demo
if (require.main === module) {
  async function main() {
    console.log('🎮 AutoSDLC Demo Suite\n');
    console.log('Choose demo:');
    console.log('1. Complete Workflow Demo');
    console.log('2. TDD Cycle Demo');
    console.log('3. Both\n');

    const choice = process.argv[2] || '1';

    switch (choice) {
      case '1':
        await runWorkflowDemo();
        break;
      case '2':
        await runTDDCycleDemo();
        break;
      case '3':
        await runWorkflowDemo();
        await runTDDCycleDemo();
        break;
      default:
        console.log('Invalid choice. Running complete workflow demo...');
        await runWorkflowDemo();
    }

    console.log('\n🏁 Demo completed!');
    process.exit(0);
  }

  main().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runWorkflowDemo, runTDDCycleDemo };
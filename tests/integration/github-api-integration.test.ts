/**
 * GitHub API Integration Tests
 * 
 * Tests for real GitHub API integration replacing mock implementations.
 * These tests follow TDD principles - written BEFORE implementation.
 * 
 * Tests will be RED initially (failing) until real GitHub integration is implemented.
 */

import { PMAgent } from '../../src/agents/pm-agent';
import { DatabaseManager } from '../../src/core/database-manager';
import { Octokit } from '@octokit/rest';
import * as path from 'path';
import * as fs from 'fs';

describe('GitHub API Integration', () => {
  let pmAgent: PMAgent;
  let database: DatabaseManager;
  let testRepo: string;
  let workspaceBase: string;

  beforeAll(async () => {
    // Setup test environment
    workspaceBase = path.join(__dirname, '../temp/github-test');
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

    // Initialize PM Agent with real GitHub integration
    pmAgent = new PMAgent({
      agentId: 'pm-test-agent',
      agentType: 'pm-agent',
      workspaceDir: workspaceBase,
      sharedStatusDir: sharedStatusDir,
      mcpServerUrl: 'http://localhost:9999',
      githubToken: process.env.GITHUB_TOKEN || 'test-token',
      githubRepo: process.env.GITHUB_TEST_REPO || 'reza899/AutoSDLC'
    });

    await pmAgent.initialize();
    testRepo = process.env.GITHUB_TEST_REPO || 'reza899/AutoSDLC';
  });

  afterAll(async () => {
    await pmAgent.shutdown();
    await database.disconnect();
    
    // Cleanup test workspace
    if (fs.existsSync(workspaceBase)) {
      fs.rmSync(workspaceBase, { recursive: true, force: true });
    }
  });

  describe('Real GitHub Issue Creation', () => {
    it('should create real GitHub issue with API call', async () => {
      // TDD: This test will be RED until real implementation
      const issueData = {
        title: 'Test Issue from AutoSDLC Integration Test',
        description: 'This issue was created by an automated test to validate GitHub API integration.',
        labels: ['test', 'autosdlc', 'integration'],
        priority: 'medium'
      };

      const result = await pmAgent.invokeTool('createGitHubIssue', issueData);

      // Assertions for real GitHub API integration
      expect(result).toHaveProperty('issueNumber');
      expect(typeof result.issueNumber).toBe('number');
      expect(result.issueNumber).toBeGreaterThan(0);
      expect(result).toHaveProperty('issueUrl');
      expect(result.issueUrl).toMatch(/^https:\/\/github\.com\/.+\/issues\/\d+$/);
      expect(result).toHaveProperty('labels');
      expect(result.labels).toEqual(expect.arrayContaining(['test', 'autosdlc', 'integration']));

      // Verify issue exists on GitHub by making direct API call
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      const [owner, repo] = testRepo.split('/');
      const issue = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: result.issueNumber
      });

      expect(issue.data.title).toBe(issueData.title);
      expect(issue.data.body).toBe(issueData.description);
      expect(issue.data.labels.map(l => typeof l === 'string' ? l : l.name))
        .toEqual(expect.arrayContaining(['test', 'autosdlc', 'integration']));
    });

    it('should handle GitHub API rate limiting gracefully', async () => {
      // Test rate limiting scenarios
      const createPromises = Array.from({ length: 10 }, (_, i) => 
        pmAgent.invokeTool('createGitHubIssue', {
          title: `Rate Limit Test Issue ${i + 1}`,
          description: 'Testing rate limiting handling',
          labels: ['test', 'rate-limit'],
          priority: 'low'
        })
      );

      // Should handle rate limiting without throwing errors
      const results = await Promise.allSettled(createPromises);
      
      // At least some should succeed, failures should be handled gracefully
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(succeeded.length).toBeGreaterThan(0);
      
      // If any failed, they should fail with rate limiting error, not crash
      failed.forEach(failure => {
        if (failure.status === 'rejected') {
          expect(failure.reason.message).toMatch(/rate limit|API limit|too many requests/i);
        }
      });
    });

    it('should handle GitHub API authentication errors', async () => {
      // Create PM Agent with invalid token
      const invalidPMAgent = new PMAgent({
        agentId: 'pm-invalid-agent',
        agentType: 'pm-agent',
        workspaceDir: workspaceBase,
        sharedStatusDir: path.join(workspaceBase, 'shared-status'),
        mcpServerUrl: 'http://localhost:9999',
        githubToken: 'invalid-token',
        githubRepo: testRepo
      });

      await invalidPMAgent.initialize();

      await expect(
        invalidPMAgent.invokeTool('createGitHubIssue', {
          title: 'Test Issue with Invalid Auth',
          description: 'This should fail',
          labels: ['test'],
          priority: 'low'
        })
      ).rejects.toThrow(/authentication|unauthorized|invalid token/i);

      await invalidPMAgent.shutdown();
    });
  });

  describe('GitHub Issue Management', () => {
    let testIssueNumber: number;

    beforeEach(async () => {
      // Create a test issue for management operations
      const result = await pmAgent.invokeTool('createGitHubIssue', {
        title: 'Test Issue for Management Operations',
        description: 'This issue is used for testing update and comment operations',
        labels: ['test', 'management'],
        priority: 'medium'
      });
      testIssueNumber = result.issueNumber;
    });

    it('should add comments to existing GitHub issues', async () => {
      const comment = 'This is a test comment added by AutoSDLC integration test';
      
      const result = await pmAgent.invokeTool('addGitHubComment', {
        issueNumber: testIssueNumber,
        comment: comment
      });

      expect(result).toHaveProperty('commentId');
      expect(result).toHaveProperty('commentUrl');
      expect(result.commentUrl).toMatch(/^https:\/\/github\.com\/.+\/issues\/\d+#issuecomment-\d+$/);

      // Verify comment exists by direct API call
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      const [owner, repo] = testRepo.split('/');
      const comments = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: testIssueNumber
      });

      const addedComment = comments.data.find(c => c.body === comment);
      expect(addedComment).toBeDefined();
      expect(addedComment?.id).toBe(result.commentId);
    });

    it('should update GitHub issue status and labels', async () => {
      const result = await pmAgent.invokeTool('updateGitHubIssue', {
        issueNumber: testIssueNumber,
        status: 'in_progress',
        labels: ['test', 'management', 'in-progress'],
        assignees: ['reza899']
      });

      expect(result).toHaveProperty('updated');
      expect(result.updated).toBe(true);

      // Verify update by direct API call
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      const [owner, repo] = testRepo.split('/');
      const issue = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: testIssueNumber
      });

      expect(issue.data.labels.map(l => typeof l === 'string' ? l : l.name))
        .toEqual(expect.arrayContaining(['test', 'management', 'in-progress']));
      expect(issue.data.assignees?.map(a => a.login))
        .toEqual(expect.arrayContaining(['reza899']));
    });
  });

  describe('GitHub Webhook Integration', () => {
    it('should register webhook for repository events', async () => {
      const webhookConfig = {
        url: 'https://autosdlc.example.com/webhooks/github',
        events: ['issues', 'pull_request', 'push'],
        secret: 'test-webhook-secret'
      };

      const result = await pmAgent.invokeTool('registerWebhook', webhookConfig);

      expect(result).toHaveProperty('webhookId');
      expect(result).toHaveProperty('webhookUrl');
      expect(result.webhookUrl).toBe(webhookConfig.url);
      expect(result).toHaveProperty('events');
      expect(result.events).toEqual(expect.arrayContaining(webhookConfig.events));

      // Verify webhook exists by direct API call
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      const [owner, repo] = testRepo.split('/');
      const webhooks = await octokit.rest.repos.listWebhooks({
        owner,
        repo
      });

      const registeredWebhook = webhooks.data.find(w => w.config.url === webhookConfig.url);
      expect(registeredWebhook).toBeDefined();
      expect(registeredWebhook?.events).toEqual(expect.arrayContaining(webhookConfig.events));
    });

    it('should handle webhook payload validation', async () => {
      const mockPayload = {
        action: 'opened',
        issue: {
          number: 123,
          title: 'Test Issue',
          body: 'Test issue body',
          user: { login: 'testuser' }
        },
        repository: {
          name: 'AutoSDLC',
          full_name: 'reza899/AutoSDLC'
        }
      };

      const result = await pmAgent.invokeTool('processWebhookPayload', {
        payload: mockPayload,
        signature: 'sha256=test-signature',
        event: 'issues'
      });

      expect(result).toHaveProperty('processed');
      expect(result.processed).toBe(true);
      expect(result).toHaveProperty('actionTaken');
      expect(result.actionTaken).toMatch(/issue.*opened/i);
    });
  });

  describe('GitHub API Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      // Temporarily override GitHub API endpoint to simulate network error
      const pmAgentOffline = new PMAgent({
        agentId: 'pm-offline-agent',
        agentType: 'pm-agent',
        workspaceDir: workspaceBase,
        sharedStatusDir: path.join(workspaceBase, 'shared-status'),
        mcpServerUrl: 'http://localhost:9999',
        githubToken: process.env.GITHUB_TOKEN || 'test-token',
        githubRepo: testRepo,
        githubApiUrl: 'https://api.github-nonexistent.com' // Invalid endpoint
      });

      await pmAgentOffline.initialize();

      await expect(
        pmAgentOffline.invokeTool('createGitHubIssue', {
          title: 'Test Network Error',
          description: 'This should fail with network error',
          labels: ['test'],
          priority: 'low'
        })
      ).rejects.toThrow(/network|connection|ENOTFOUND/i);

      await pmAgentOffline.shutdown();
    });

    it('should implement exponential backoff for API failures', async () => {
      const startTime = Date.now();
      
      try {
        await pmAgent.invokeTool('createGitHubIssue', {
          title: 'Test Retry Logic',
          description: 'Testing exponential backoff',
          labels: ['test', 'retry'],
          priority: 'low',
          simulateFailure: true // Special flag to force failure for testing
        });
      } catch (error) {
        const elapsedTime = Date.now() - startTime;
        
        // Should have taken time due to retries (at least 1 second for exponential backoff)
        expect(elapsedTime).toBeGreaterThan(1000);
        expect(error.message).toMatch(/retry|backoff|failed after/i);
      }
    });
  });

  describe('GitHub API Performance', () => {
    it('should complete GitHub operations within acceptable timeframes', async () => {
      const startTime = Date.now();
      
      const result = await pmAgent.invokeTool('createGitHubIssue', {
        title: 'Performance Test Issue',
        description: 'Testing API response time',
        labels: ['test', 'performance'],
        priority: 'low'
      });

      const elapsedTime = Date.now() - startTime;
      
      expect(result).toHaveProperty('issueNumber');
      expect(elapsedTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should cache GitHub API responses appropriately', async () => {
      // First call - should hit API
      const startTime1 = Date.now();
      const result1 = await pmAgent.invokeTool('getRepositoryInfo', {
        repository: testRepo
      });
      const elapsedTime1 = Date.now() - startTime1;

      // Second call - should use cache
      const startTime2 = Date.now();
      const result2 = await pmAgent.invokeTool('getRepositoryInfo', {
        repository: testRepo
      });
      const elapsedTime2 = Date.now() - startTime2;

      expect(result1).toEqual(result2);
      expect(elapsedTime2).toBeLessThan(elapsedTime1); // Cached call should be faster
      expect(elapsedTime2).toBeLessThan(100); // Cached call should be very fast
    });
  });
});
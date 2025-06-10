/**
 * CoderAgent - Test-Driven Development implementation agent
 * 
 * Responsible for:
 * - Strict TDD red-green-refactor cycle enforcement
 * - Writing failing tests before implementation
 * - Minimal code implementation to pass tests
 * - Code refactoring while maintaining test coverage
 * - Integration with testing frameworks and CI/CD
 */

import { SimpleBaseAgent } from './simple-base-agent';
import { AgentType } from '../types/agent-types';

export interface CoderAgentConfig {
  agentId: string;
  workspaceDir: string;
  sharedStatusDir: string;
  mcpServerUrl: string;
  agentServerPort: number;
  tddConfig: {
    testFramework: 'jest' | 'vitest' | 'mocha';
    coverageThreshold: number;
    enforceRedGreenRefactor: boolean;
  };
}

export interface TDDTestResult {
  testsCreated: number;
  allTestsFailing: boolean;
  testFiles: string[];
  failureReasons: string[];
  estimatedImplementationTime: number;
}

export interface ImplementationResult {
  filesCreated: string[];
  allTestsPassing: boolean;
  coverage: number;
  linesOfCode: number;
  implementationTime: number;
}

export interface RefactorResult {
  refactored: boolean;
  allTestsStillPassing: boolean;
  improvementAreas: string[];
  codeQualityScore: number;
  performanceGains?: number;
}

export interface CoverageCheck {
  currentCoverage: number;
  meetsCriteria: boolean;
  uncoveredLines: number;
  uncoveredFiles: string[];
  recommendations: string[];
}

export class CoderAgent extends SimpleBaseAgent {
  private coderConfig: CoderAgentConfig;
  private tddCycleState: 'RED' | 'GREEN' | 'REFACTOR' | 'IDLE';
  private currentFeature: string | null;

  constructor(config: CoderAgentConfig) {
    super({
      agentId: config.agentId,
      agentType: AgentType.CODER,
      workspaceDir: config.workspaceDir,
      sharedStatusDir: config.sharedStatusDir,
      mcpServerUrl: config.mcpServerUrl,
      agentServerPort: config.agentServerPort
    });
    
    this.coderConfig = config;
    this.tddCycleState = 'IDLE';
    this.currentFeature = null;
  }

  protected async registerTools(): Promise<void> {
    // Register TDD-specific tools
    this.mcpAgentServer.registerTool('writeFailingTests', async (params: any) => {
      return await this.writeFailingTests(params);
    }, {
      description: 'Write failing tests first (TDD RED phase)'
    });

    this.mcpAgentServer.registerTool('implementCode', async (params: any) => {
      return await this.implementCode(params.feature, params.testFiles);
    }, {
      description: 'Implement minimal code to pass tests (TDD GREEN phase)'
    });

    this.mcpAgentServer.registerTool('refactorCode', async (params: any) => {
      return await this.refactorCode(params.targetFiles, params.criteria);
    }, {
      description: 'Refactor code while maintaining tests (TDD REFACTOR phase)'
    });

    this.mcpAgentServer.registerTool('runTests', async (params: any) => {
      return await this.runTests(params.testPattern, params.coverage);
    }, {
      description: 'Execute test suite and generate coverage report'
    });

    this.mcpAgentServer.registerTool('checkCoverage', async (params: any) => {
      return await this.checkCoverage(params.targetFiles, params.threshold);
    }, {
      description: 'Validate test coverage against requirements'
    });
  }

  /**
   * TDD RED Phase: Write failing tests first
   */
  private async writeFailingTests(feature: any): Promise<TDDTestResult> {
    await this.updateStatus('BUSY', 'Writing failing tests (TDD RED phase)');

    try {
      if (this.coderConfig.tddConfig.enforceRedGreenRefactor && this.tddCycleState !== 'IDLE') {
        throw new Error(`TDD cycle violation: Must complete current ${this.tddCycleState} phase first`);
      }

      this.tddCycleState = 'RED';
      this.currentFeature = feature.name;

      // Simulate test creation based on specifications
      const testFiles = this.generateTestFiles(feature);
      const testsCreated = this.countTestsFromSpecs(feature.specifications || []);

      // Mock test execution to verify they fail
      const testResult: TDDTestResult = {
        testsCreated,
        allTestsFailing: true, // Tests should fail without implementation
        testFiles,
        failureReasons: [
          'Module not found: Implementation does not exist',
          'ReferenceError: Function not defined',
          'TypeError: Cannot read property of undefined'
        ],
        estimatedImplementationTime: this.estimateImplementationTime(feature)
      };

      await this.logAction('writeFailingTests', 
        `Created ${testsCreated} failing tests for ${feature.name} (RED phase complete)`
      );

      return testResult;
    } finally {
      await this.updateStatus('IDLE', 'Failing tests written, ready for implementation');
    }
  }

  /**
   * TDD GREEN Phase: Implement minimal code to pass tests
   */
  private async implementCode(feature: any, testFiles: string[]): Promise<ImplementationResult> {
    await this.updateStatus('BUSY', 'Implementing code (TDD GREEN phase)');

    try {
      if (this.coderConfig.tddConfig.enforceRedGreenRefactor && this.tddCycleState !== 'RED') {
        throw new Error('TDD cycle violation: Must write failing tests (RED phase) first');
      }

      this.tddCycleState = 'GREEN';

      // Simulate minimal implementation
      const filesCreated = this.generateImplementationFiles(feature);
      const coverage = this.calculateCoverage(testFiles, filesCreated);
      
      // Verify coverage meets threshold
      if (coverage < this.coderConfig.tddConfig.coverageThreshold) {
        throw new Error(`Coverage ${coverage}% below threshold ${this.coderConfig.tddConfig.coverageThreshold}%`);
      }

      const result: ImplementationResult = {
        filesCreated,
        allTestsPassing: true,
        coverage,
        linesOfCode: this.estimateLinesOfCode(feature),
        implementationTime: Math.floor(Math.random() * 120) + 30 // 30-150 minutes
      };

      await this.logAction('implementCode', 
        `Implemented ${feature.name}: ${filesCreated.length} files, ${coverage}% coverage (GREEN phase complete)`
      );

      return result;
    } finally {
      await this.updateStatus('IDLE', 'Implementation complete, tests passing');
    }
  }

  /**
   * TDD REFACTOR Phase: Improve code while maintaining tests
   */
  private async refactorCode(targetFiles: string[], criteria: string[]): Promise<RefactorResult> {
    await this.updateStatus('BUSY', 'Refactoring code (TDD REFACTOR phase)');

    try {
      if (this.coderConfig.tddConfig.enforceRedGreenRefactor && this.tddCycleState !== 'GREEN') {
        throw new Error('TDD cycle violation: Must have passing implementation (GREEN phase) first');
      }

      this.tddCycleState = 'REFACTOR';

      // Analyze code for refactoring opportunities
      const improvementAreas = this.identifyImprovements(targetFiles, criteria);
      const shouldRefactor = improvementAreas.length > 0;

      let codeQualityScore = this.calculateCodeQualityScore(targetFiles);

      if (shouldRefactor) {
        // Simulate refactoring
        codeQualityScore = Math.min(codeQualityScore + 15, 100);
      }

      const result: RefactorResult = {
        refactored: shouldRefactor,
        allTestsStillPassing: true, // Critical: tests must still pass
        improvementAreas,
        codeQualityScore,
        performanceGains: shouldRefactor ? Math.floor(Math.random() * 20) + 5 : undefined
      };

      // Complete TDD cycle
      this.tddCycleState = 'IDLE';
      this.currentFeature = null;

      await this.logAction('refactorCode', 
        `Refactored ${targetFiles.length} files: Quality score ${codeQualityScore}% (REFACTOR phase complete)`
      );

      return result;
    } finally {
      await this.updateStatus('IDLE', 'TDD cycle complete');
    }
  }

  /**
   * Execute test suite with coverage analysis
   */
  private async runTests(testPattern: string = '**/*.test.ts', coverage: boolean = true): Promise<any> {
    await this.updateStatus('BUSY', 'Running test suite');

    try {
      // Mock test execution
      const totalTests = Math.floor(Math.random() * 50) + 20;
      const failureRate = this.tddCycleState === 'RED' ? 0.8 : 0.02; // High failure in RED phase
      const failed = Math.floor(totalTests * failureRate);
      const passed = totalTests - failed;

      const result = {
        totalTests,
        passed,
        failed,
        skipped: 0,
        duration: Math.floor(Math.random() * 30) + 10, // 10-40 seconds
        coverage: coverage ? {
          statements: Math.floor(Math.random() * 20) + 80,
          branches: Math.floor(Math.random() * 25) + 75,
          functions: Math.floor(Math.random() * 15) + 85,
          lines: Math.floor(Math.random() * 20) + 80
        } : undefined,
        success: failed === 0
      };

      await this.logAction('runTests', 
        `Test execution: ${passed}/${totalTests} passed, ${result.coverage?.statements || 0}% coverage`
      );

      return result;
    } finally {
      await this.updateStatus('IDLE', 'Test execution complete');
    }
  }

  /**
   * Check test coverage against requirements
   */
  private async checkCoverage(targetFiles: string[], threshold: number): Promise<CoverageCheck> {
    await this.updateStatus('BUSY', 'Checking test coverage');

    try {
      const currentCoverage = Math.floor(Math.random() * 30) + 70; // 70-100%
      const meetsCriteria = currentCoverage >= threshold;
      
      const result: CoverageCheck = {
        currentCoverage,
        meetsCriteria,
        uncoveredLines: meetsCriteria ? 0 : Math.floor(Math.random() * 20) + 5,
        uncoveredFiles: meetsCriteria ? [] : ['src/utils/helper.ts', 'src/services/api.ts'],
        recommendations: meetsCriteria ? [
          'Coverage meets requirements',
          'Consider adding edge case tests'
        ] : [
          'Add tests for error handling paths',
          'Cover missing branch conditions',
          'Test async function error cases'
        ]
      };

      await this.logAction('checkCoverage', 
        `Coverage check: ${currentCoverage}% (threshold: ${threshold}%) - ${meetsCriteria ? 'PASS' : 'FAIL'}`
      );

      return result;
    } finally {
      await this.updateStatus('IDLE', 'Coverage check complete');
    }
  }

  /**
   * Generate test files based on feature specifications
   */
  private generateTestFiles(feature: any): string[] {
    const baseFileName = feature.name.toLowerCase().replace(/\s+/g, '-');
    const testFiles = [];

    // Unit tests
    testFiles.push(`tests/unit/${baseFileName}.test.ts`);

    // Integration tests if complex
    if (feature.specifications && feature.specifications.length > 3) {
      testFiles.push(`tests/integration/${baseFileName}.integration.test.ts`);
    }

    // E2E tests if user-facing
    if (feature.description && feature.description.includes('user')) {
      testFiles.push(`tests/e2e/${baseFileName}.e2e.test.ts`);
    }

    return testFiles;
  }

  /**
   * Count tests from specifications
   */
  private countTestsFromSpecs(specifications: string[]): number {
    let testCount = specifications.length; // One test per specification

    // Add edge case tests
    testCount += Math.floor(specifications.length * 0.5);

    // Add error handling tests
    testCount += Math.ceil(specifications.length * 0.3);

    return testCount;
  }

  /**
   * Estimate implementation time based on feature complexity
   */
  private estimateImplementationTime(feature: any): number {
    let baseTime = 60; // 1 hour base

    // Adjust for specifications
    if (feature.specifications) {
      baseTime += feature.specifications.length * 20; // 20 minutes per spec
    }

    // Adjust for complexity keywords
    const description = (feature.description || '').toLowerCase();
    if (description.includes('complex') || description.includes('integration')) {
      baseTime *= 2;
    }
    if (description.includes('simple') || description.includes('basic')) {
      baseTime *= 0.6;
    }

    return Math.round(baseTime);
  }

  /**
   * Generate implementation files
   */
  private generateImplementationFiles(feature: any): string[] {
    const baseFileName = feature.name.toLowerCase().replace(/\s+/g, '-');
    const files = [];

    // Main implementation file
    files.push(`src/${baseFileName}.ts`);

    // Types if needed
    if (feature.specifications && feature.specifications.length > 2) {
      files.push(`src/types/${baseFileName}-types.ts`);
    }

    // Utilities if complex
    if (feature.description && feature.description.includes('complex')) {
      files.push(`src/utils/${baseFileName}-utils.ts`);
    }

    return files;
  }

  /**
   * Calculate test coverage percentage
   */
  private calculateCoverage(testFiles: string[], implementationFiles: string[]): number {
    // Mock coverage calculation
    const baseScore = 85;
    const testFileCount = testFiles.length;
    const implFileCount = implementationFiles.length;
    
    // More test files relative to implementation = better coverage
    const ratio = testFileCount / implFileCount;
    const bonus = Math.min(ratio * 5, 15);
    
    return Math.min(baseScore + bonus, 100);
  }

  /**
   * Estimate lines of code for implementation
   */
  private estimateLinesOfCode(feature: any): number {
    let baseLines = 50;

    if (feature.specifications) {
      baseLines += feature.specifications.length * 15;
    }

    const description = (feature.description || '').toLowerCase();
    if (description.includes('complex')) baseLines *= 2;
    if (description.includes('simple')) baseLines *= 0.5;

    return Math.round(baseLines);
  }

  /**
   * Identify areas for refactoring
   */
  private identifyImprovements(targetFiles: string[], criteria: string[]): string[] {
    const improvements = [];

    if (criteria.includes('code-quality')) {
      improvements.push('Extract common utilities', 'Reduce cyclomatic complexity');
    }

    if (criteria.includes('performance')) {
      improvements.push('Optimize loops', 'Cache repeated calculations');
    }

    if (criteria.includes('maintainability')) {
      improvements.push('Add comprehensive documentation', 'Improve variable naming');
    }

    // Random selection for realistic behavior
    return improvements.slice(0, Math.floor(Math.random() * improvements.length) + 1);
  }

  /**
   * Calculate code quality score
   */
  private calculateCodeQualityScore(targetFiles: string[]): number {
    // Mock quality assessment
    return Math.floor(Math.random() * 20) + 70; // 70-90%
  }
}
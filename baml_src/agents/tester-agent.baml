// Tester Agent test execution and CI/CD schemas for AutoSDLC
// These schemas define test execution, monitoring, and deployment workflows

// Test execution request
class TestExecutionRequest {
  testSuite: string @description("Test suite identifier or path pattern")
  testFramework: TestFramework
  environment: TestEnvironment
  configuration: TestConfiguration
  filters: TestFilters?
  parallelization: ParallelizationConfig?
}

// Test environment schema
class TestEnvironment {
  name: string @description("e.g., local, ci, staging")
  variables: EnvironmentVariable[]
  services: ServiceDependency[]
  resources: ResourceRequirement[]
}

// Environment variable schema
class EnvironmentVariable {
  name: string
  value: string
  secret: bool @description("Whether this is a sensitive value")
}

// Service dependency schema
class ServiceDependency {
  name: string
  type: ServiceType
  version: string
  configuration: string @description("JSON configuration")
  healthCheck: HealthCheck?
}

// Service type enumeration
enum ServiceType {
  DATABASE
  CACHE
  MESSAGE_QUEUE
  API_MOCK
  STORAGE
  SEARCH
}

// Health check schema
class HealthCheck {
  endpoint: string
  interval: int @description("Check interval in seconds")
  timeout: int @description("Timeout in seconds")
  retries: int
}

// Resource requirement schema
class ResourceRequirement {
  cpu: string @description("e.g., 2 cores, 1000m")
  memory: string @description("e.g., 4GB, 4096Mi")
  storage: string @description("e.g., 10GB")
  network: string? @description("Network bandwidth requirements")
}

// Test configuration schema
class TestConfiguration {
  timeout: int @description("Global timeout in milliseconds")
  retries: int @description("Number of retries for flaky tests")
  bail: bool @description("Stop on first failure")
  verbose: bool
  collectCoverage: bool
  coverageThresholds: CoverageTargets?
  reporters: TestReporter[]
}

// Test reporter schema
class TestReporter {
  type: ReporterType
  outputPath: string?
  options: string @description("JSON reporter options")
}

// Reporter type enumeration
enum ReporterType {
  CONSOLE
  JSON
  HTML
  JUNIT
  COVERAGE_LCOV
  COVERAGE_HTML
  CUSTOM
}

// Test filters schema
class TestFilters {
  includePatterns: string[]? @description("Glob patterns to include")
  excludePatterns: string[]? @description("Glob patterns to exclude")
  tags: string[]? @description("Test tags to run")
  grep: string? @description("Pattern to match test names")
  only: string[]? @description("Specific test files to run")
}

// Parallelization configuration
class ParallelizationConfig {
  workers: int @description("Number of parallel workers")
  strategy: ParallelizationStrategy
  shardIndex: int? @description("For distributed testing")
  totalShards: int? @description("Total number of shards")
}

// Parallelization strategy enumeration
enum ParallelizationStrategy {
  BY_FILE
  BY_SUITE
  BY_TEST
  ROUND_ROBIN
  LOAD_BALANCED
}

// Test execution result
class TestExecutionResult {
  summary: TestExecutionSummary
  testResults: DetailedTestResult[]
  coverage: CoverageReport?
  performance: PerformanceMetrics
  artifacts: TestArtifact[]
  logs: TestLog[]
}

// Test execution summary
class TestExecutionSummary {
  total: int
  passed: int
  failed: int
  skipped: int
  pending: int
  duration: float @description("Total duration in seconds")
  startTime: string @description("ISO 8601 timestamp")
  endTime: string @description("ISO 8601 timestamp")
  exitCode: int
}

// Detailed test result schema
class DetailedTestResult {
  id: string
  file: string
  suite: string[]
  name: string
  status: TestStatus
  duration: float @description("Duration in milliseconds")
  error: TestError?
  retries: int
  screenshots: string[]? @description("Paths to screenshots")
  videos: string[]? @description("Paths to videos")
  logs: string[]
}

// Test error schema
class TestError {
  message: string
  stack: string?
  diff: TestDiff?
  code: string?
  type: ErrorType
}

// Test diff schema
class TestDiff {
  expected: string
  actual: string
  diffType: DiffType
}

// Diff type enumeration
enum DiffType {
  STRING
  JSON
  OBJECT
  ARRAY
  NUMBER
  BOOLEAN
}

// Error type enumeration
enum ErrorType {
  ASSERTION
  TIMEOUT
  SETUP
  TEARDOWN
  UNCAUGHT_EXCEPTION
  UNHANDLED_REJECTION
  SYNTAX
  REFERENCE
}

// Performance metrics schema
class PerformanceMetrics {
  cpuUsage: CPUMetrics
  memoryUsage: MemoryMetrics
  slowestTests: SlowTestInfo[]
  bottlenecks: PerformanceBottleneck[]
}

// CPU metrics schema
class CPUMetrics {
  average: float @description("Average CPU usage percentage")
  peak: float @description("Peak CPU usage percentage")
  system: float @description("System CPU time in seconds")
  user: float @description("User CPU time in seconds")
}

// Memory metrics schema
class MemoryMetrics {
  average: float @description("Average memory usage in MB")
  peak: float @description("Peak memory usage in MB")
  heapUsed: float @description("Heap memory used in MB")
  external: float @description("External memory in MB")
}

// Slow test information
class SlowTestInfo {
  test: string
  duration: float @description("Duration in milliseconds")
  file: string
  threshold: float @description("Expected duration threshold")
}

// Performance bottleneck schema
class PerformanceBottleneck {
  type: BottleneckType
  location: string
  impact: float @description("Performance impact in milliseconds")
  suggestion: string
}

// Bottleneck type enumeration
enum BottleneckType {
  SLOW_SETUP
  SLOW_TEARDOWN
  SYNCHRONOUS_IO
  EXCESSIVE_MOCKING
  LARGE_SNAPSHOT
  MEMORY_LEAK
}

// Test artifact schema
class TestArtifact {
  type: ArtifactType
  path: string
  size: int @description("Size in bytes")
  mimeType: string
  description: string
}

// Artifact type enumeration
enum ArtifactType {
  SCREENSHOT
  VIDEO
  LOG
  COVERAGE_REPORT
  PERFORMANCE_PROFILE
  HEAP_DUMP
  CUSTOM
}

// Test log schema
class TestLog {
  level: LogLevel
  message: string
  timestamp: string @description("ISO 8601 timestamp")
  source: string
  metadata: string? @description("JSON metadata")
}

// Log level enumeration
enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
  FATAL
}

// CI/CD pipeline configuration
class CIPipelineConfig {
  name: string
  trigger: PipelineTrigger
  stages: PipelineStage[]
  environment: TestEnvironment
  notifications: NotificationConfig[]
  artifacts: ArtifactConfig
}

// Pipeline trigger schema
class PipelineTrigger {
  type: TriggerType
  branches: string[]? @description("Branch patterns")
  tags: string[]? @description("Tag patterns")
  schedule: string? @description("Cron expression")
  manual: bool
}

// Trigger type enumeration
enum TriggerType {
  PUSH
  PULL_REQUEST
  TAG
  SCHEDULE
  MANUAL
  WEBHOOK
}

// Pipeline stage schema
class PipelineStage {
  name: string
  jobs: PipelineJob[]
  dependsOn: string[]?
  condition: string? @description("Condition expression")
  allowFailure: bool
}

// Pipeline job schema
class PipelineJob {
  name: string
  runner: string @description("Runner label or type")
  steps: JobStep[]
  timeout: int @description("Timeout in minutes")
  retry: RetryConfig?
  artifacts: string[]?
}

// Job step schema
class JobStep {
  name: string
  command: string
  workingDirectory: string?
  environment: EnvironmentVariable[]?
  continueOnError: bool
  timeout: int? @description("Step timeout in seconds")
}

// Retry configuration schema
class RetryConfig {
  maxAttempts: int
  backoffFactor: float
  conditions: string[] @description("Retry condition expressions")
}

// Notification configuration schema
class NotificationConfig {
  type: NotificationType
  events: NotificationEvent[]
  recipients: string[]
  template: string?
}

// Notification type enumeration
enum NotificationType {
  EMAIL
  SLACK
  WEBHOOK
  GITHUB_STATUS
  JIRA
}

// Notification event enumeration
enum NotificationEvent {
  PIPELINE_START
  PIPELINE_SUCCESS
  PIPELINE_FAILURE
  STAGE_FAILURE
  TEST_FAILURE_THRESHOLD
}

// Artifact configuration schema
class ArtifactConfig {
  paths: string[]
  retentionDays: int
  uploadOnFailure: bool
  compression: bool
}

// Test analysis request
class TestAnalysisRequest {
  results: TestExecutionResult[]
  historicalData: HistoricalTestData?
  thresholds: QualityThresholds
}

// Historical test data schema
class HistoricalTestData {
  runs: TestRunHistory[]
  trends: TestTrend[]
  knownFlaky: string[] @description("Test IDs known to be flaky")
}

// Test run history schema
class TestRunHistory {
  runId: string
  timestamp: string
  branch: string
  commit: string
  summary: TestExecutionSummary
  flakyTests: string[]
}

// Test trend schema
class TestTrend {
  metric: TrendMetric
  values: TrendDataPoint[]
  trend: TrendDirection
  significance: float @description("Statistical significance")
}

// Trend metric enumeration
enum TrendMetric {
  PASS_RATE
  DURATION
  FLAKINESS
  COVERAGE
  NEW_FAILURES
}

// Trend data point schema
class TrendDataPoint {
  timestamp: string
  value: float
  runId: string
}

// Trend direction enumeration
enum TrendDirection {
  IMPROVING
  STABLE
  DEGRADING
  VOLATILE
}

// Quality thresholds schema
class QualityThresholds {
  minPassRate: float
  maxDuration: int @description("Maximum total duration in seconds")
  maxFlakiness: float @description("Maximum flaky test percentage")
  coverageTargets: CoverageTargets
}

// Test analysis result
class TestAnalysisResult {
  summary: AnalysisSummary
  issues: QualityIssue[]
  recommendations: TestRecommendation[]
  flakyTests: FlakyTestAnalysis[]
  performanceAnalysis: TestPerformanceAnalysis
}

// Analysis summary schema
class AnalysisSummary {
  overallHealth: HealthStatus
  passRate: float
  averageDuration: float
  flakinessRate: float
  coverageStatus: CoverageStatus
  trendsDetected: string[]
}

// Health status enumeration
enum HealthStatus {
  EXCELLENT
  GOOD
  FAIR
  POOR
  CRITICAL
}

// Coverage status enumeration
enum CoverageStatus {
  EXCEEDS_TARGET
  MEETS_TARGET
  BELOW_TARGET
  CRITICALLY_LOW
}

// Quality issue schema
class QualityIssue {
  severity: IssueSeverity
  type: IssueType
  description: string
  affectedTests: string[]
  impact: string
  suggestedFix: string
}

// Issue severity enumeration
enum IssueSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

// Issue type enumeration
enum IssueType {
  HIGH_FAILURE_RATE
  SLOW_TESTS
  FLAKY_TESTS
  LOW_COVERAGE
  MEMORY_ISSUES
  TIMEOUT_ISSUES
}

// Test recommendation schema
class TestRecommendation {
  type: RecommendationType
  priority: Priority
  description: string
  expectedBenefit: string
  implementation: string
  effort: EffortLevel
}

// Recommendation type enumeration
enum RecommendationType {
  ADD_TESTS
  REFACTOR_TESTS
  PARALLELIZE
  OPTIMIZE_SETUP
  FIX_FLAKY
  UPDATE_DEPENDENCIES
}

// Priority enumeration
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// Flaky test analysis schema
class FlakyTestAnalysis {
  testId: string
  flakinessScore: float @description("0-1 score of flakiness")
  failurePattern: string @description("Pattern of failures")
  likelyCause: FlakyCause
  fixSuggestion: string
  historicalData: FlakeHistory[]
}

// Flaky cause enumeration
enum FlakyCause {
  TIMING_ISSUE
  RACE_CONDITION
  EXTERNAL_DEPENDENCY
  TEST_ISOLATION
  RANDOM_DATA
  ENVIRONMENT_SPECIFIC
}

// Flake history schema
class FlakeHistory {
  runId: string
  passed: bool
  duration: float
  errorType: string?
}

// Test performance analysis schema
class TestPerformanceAnalysis {
  totalDuration: float
  parallelizationEfficiency: float
  bottlenecks: TestBottleneck[]
  optimizationOpportunities: OptimizationOpportunity[]
}

// Test bottleneck schema
class TestBottleneck {
  type: TestBottleneckType
  location: string
  impact: float @description("Time impact in seconds")
  frequency: int @description("How often this occurs")
}

// Test bottleneck type enumeration
enum TestBottleneckType {
  SLOW_SETUP
  SLOW_TEST
  SERIAL_EXECUTION
  RESOURCE_CONTENTION
  EXTERNAL_SERVICE
}

// Optimization opportunity schema
class OptimizationOpportunity {
  type: OptimizationType
  description: string
  potentialSaving: float @description("Potential time saving in seconds")
  implementation: string
  complexity: EffortLevel
}

// Optimization type enumeration
enum OptimizationType {
  INCREASE_PARALLELIZATION
  MOCK_EXTERNAL_SERVICES
  OPTIMIZE_QUERIES
  REDUCE_TEST_DATA
  SHARE_FIXTURES
  SKIP_REDUNDANT
}

// Function to execute tests with configuration
function executeTests(request: TestExecutionRequest) -> TestExecutionResult {
  client claude-opus
  prompt #"
    Execute tests with the following configuration:
    
    Test Suite: {{ request.testSuite }}
    Framework: {{ request.testFramework }}
    Environment: {{ request.environment.name }}
    
    Configuration:
    - Timeout: {{ request.configuration.timeout }}ms
    - Retries: {{ request.configuration.retries }}
    - Coverage: {{ request.configuration.collectCoverage }}
    - Parallel Workers: {{ request.parallelization.workers if request.parallelization else 1 }}
    
    {% if request.filters %}
    Filters:
    - Include: {{ request.filters.includePatterns }}
    - Exclude: {{ request.filters.excludePatterns }}
    - Tags: {{ request.filters.tags }}
    {% endif %}
    
    Execute tests and provide detailed results including:
    1. Individual test results with timing
    2. Coverage report if enabled
    3. Performance metrics
    4. Any failures with stack traces
    5. Generated artifacts (screenshots, logs)
    
    Handle flaky tests with configured retries.
  "#
}

// Function to analyze test results for issues
function analyzeTestResults(request: TestAnalysisRequest) -> TestAnalysisResult {
  client claude-opus
  prompt #"
    Analyze test execution results for quality issues:
    
    Current Results:
    - Total Tests: {{ request.results[0].summary.total }}
    - Pass Rate: {{ (request.results[0].summary.passed / request.results[0].summary.total * 100) }}%
    - Duration: {{ request.results[0].summary.duration }}s
    
    {% if request.historicalData %}
    Historical Context:
    - Previous Runs: {{ request.historicalData.runs | length }}
    - Known Flaky Tests: {{ request.historicalData.knownFlaky | length }}
    {% endif %}
    
    Quality Thresholds:
    - Min Pass Rate: {{ request.thresholds.minPassRate }}%
    - Max Duration: {{ request.thresholds.maxDuration }}s
    - Max Flakiness: {{ request.thresholds.maxFlakiness }}%
    
    Analyze for:
    1. Test health and stability
    2. Flaky test patterns
    3. Performance degradation
    4. Coverage gaps
    5. Optimization opportunities
    
    Provide actionable recommendations with priority and effort estimates.
  "#
}

// Function to generate CI/CD pipeline configuration
function generateCIPipeline(
  project: ProjectContext,
  testStrategy: TestingStrategy
) -> CIPipelineConfig {
  client claude-sonnet
  prompt #"
    Generate CI/CD pipeline configuration for:
    
    Project: {{ project.projectName }}
    Type: {{ project.projectType }}
    
    Testing Strategy:
    - Unit Tests: {{ testStrategy.unitTestFramework }}
    - Integration Tests: {{ testStrategy.integrationTestApproach }}
    - E2E Tests: {{ testStrategy.e2eTestFramework }}
    - Coverage Target: {{ testStrategy.coverageTarget }}%
    
    Create pipeline with:
    1. Appropriate triggers (push, PR, schedule)
    2. Parallel test execution stages
    3. Coverage reporting
    4. Artifact collection
    5. Deployment stages if applicable
    6. Notification configuration
    
    Optimize for fast feedback and reliability.
  "#
}
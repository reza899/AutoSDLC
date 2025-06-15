// Code Reviewer Agent analysis and review schemas for AutoSDLC
// These schemas define code quality analysis, security scanning, and review workflows

// Code review request
class CodeReviewRequest {
  files: CodeFileForReview[]
  pullRequest: GitHubPullRequest?
  reviewType: ReviewType
  standards: CodingStandards
  securityConfig: SecurityConfig?
  performanceConfig: PerformanceConfig?
}

// Code file for review schema
class CodeFileForReview {
  path: string
  content: string
  language: ProgrammingLanguage
  changeType: FileChangeType
  previousContent: string? @description("For modified files")
  relatedTests: string[]
}

// File change type enumeration
enum FileChangeType {
  ADDED
  MODIFIED
  DELETED
  RENAMED
  MOVED
}

// Review type enumeration
enum ReviewType {
  FULL_REVIEW
  SECURITY_ONLY
  PERFORMANCE_ONLY
  STYLE_ONLY
  ARCHITECTURE_REVIEW
  QUICK_SCAN
}

// Coding standards schema
class CodingStandards {
  styleGuide: string @description("e.g., Airbnb, Google, StandardJS")
  linterConfig: LinterConfiguration
  namingConventions: NamingConventions
  complexityThresholds: ComplexityThresholds
  documentationRequirements: DocumentationRequirements
}

// Linter configuration schema
class LinterConfiguration {
  tool: LinterTool
  rules: string @description("JSON configuration for linter rules")
  ignorePatterns: string[]
  customRules: CustomLintRule[]
}

// Linter tool enumeration
enum LinterTool {
  ESLINT
  TSLINT
  PYLINT
  RUBOCOP
  GOLINT
  RUSTFMT
  PRETTIER
}

// Custom lint rule schema
class CustomLintRule {
  name: string
  severity: LintSeverity
  pattern: string @description("Regex pattern to match")
  message: string
  fix: string? @description("Suggested fix")
}

// Lint severity enumeration
enum LintSeverity {
  ERROR
  WARNING
  INFO
  OFF
}

// Complexity thresholds schema
class ComplexityThresholds {
  cyclomaticComplexity: int @default(10)
  cognitiveComplexity: int @default(15)
  nestingDepth: int @default(4)
  parameterCount: int @default(5)
  fileLength: int @default(500)
  functionLength: int @default(50)
}

// Documentation requirements schema
class DocumentationRequirements {
  requireClassDocs: bool
  requireFunctionDocs: bool
  requireParamDocs: bool
  requireReturnDocs: bool
  requireExampleCode: bool
  minCommentRatio: float @description("Minimum comment-to-code ratio")
}

// Security configuration schema
class SecurityConfig {
  scanners: SecurityScanner[]
  vulnerabilityDatabase: string
  customPatterns: SecurityPattern[]
  secretsPatterns: SecretsPattern[]
  complianceStandards: ComplianceStandard[]
}

// Security scanner schema
class SecurityScanner {
  name: string
  type: ScannerType
  configuration: string @description("JSON configuration")
  enabled: bool
}

// Scanner type enumeration
enum ScannerType {
  STATIC_ANALYSIS
  DEPENDENCY_CHECK
  SECRETS_SCAN
  LICENSE_SCAN
  CONTAINER_SCAN
}

// Security pattern schema
class SecurityPattern {
  name: string
  description: string
  pattern: string @description("Regex pattern")
  severity: SecuritySeverity
  cwe: string? @description("CWE identifier")
  fix: string @description("Suggested fix")
}

// Security severity enumeration
enum SecuritySeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}

// Secrets pattern schema
class SecretsPattern {
  type: SecretType
  pattern: string @description("Regex pattern")
  entropy: float? @description("Minimum entropy threshold")
  allowlist: string[]? @description("Patterns to ignore")
}

// Secret type enumeration
enum SecretType {
  API_KEY
  PRIVATE_KEY
  PASSWORD
  TOKEN
  CERTIFICATE
  CONNECTION_STRING
}

// Compliance standard enumeration
enum ComplianceStandard {
  OWASP_TOP_10
  PCI_DSS
  HIPAA
  GDPR
  SOC2
  ISO_27001
}

// Performance configuration schema
class PerformanceConfig {
  benchmarks: PerformanceBenchmark[]
  antiPatterns: PerformanceAntiPattern[]
  optimizationRules: OptimizationRule[]
}

// Performance benchmark schema
class PerformanceBenchmark {
  name: string
  metric: PerformanceMetric
  threshold: float
  unit: string
}

// Performance metric enumeration
enum PerformanceMetric {
  TIME_COMPLEXITY
  SPACE_COMPLEXITY
  DATABASE_QUERIES
  NETWORK_CALLS
  MEMORY_ALLOCATION
  CPU_USAGE
}

// Performance anti-pattern schema
class PerformanceAntiPattern {
  name: string
  description: string
  pattern: string @description("Code pattern to detect")
  impact: PerformanceImpact
  suggestion: string
}

// Performance impact enumeration
enum PerformanceImpact {
  SEVERE
  HIGH
  MODERATE
  LOW
  NEGLIGIBLE
}

// Optimization rule schema
class OptimizationRule {
  name: string
  applies_to: string @description("Language or framework")
  condition: string @description("When to apply")
  optimization: string @description("How to optimize")
  expectedImprovement: string
}

// Code review result
class CodeReviewResult {
  summary: ReviewSummary
  issues: CodeIssue[]
  metrics: CodeMetrics
  suggestions: CodeSuggestion[]
  securityFindings: SecurityFinding[]?
  performanceFindings: PerformanceFinding[]?
  approvalStatus: ApprovalStatus
}

// Review summary schema
class ReviewSummary {
  filesReviewed: int
  totalIssues: int
  criticalIssues: int
  codeQualityScore: float @description("0-100 score")
  securityScore: float? @description("0-100 score")
  performanceScore: float? @description("0-100 score")
  recommendation: ReviewRecommendation
}

// Review recommendation enumeration
enum ReviewRecommendation {
  APPROVE
  APPROVE_WITH_SUGGESTIONS
  REQUEST_CHANGES
  NEEDS_MAJOR_REWORK
  SECURITY_REVIEW_REQUIRED
}

// Code issue schema
class CodeIssue {
  id: string
  file: string
  line: int
  column: int?
  endLine: int?
  endColumn: int?
  type: IssueType
  severity: IssueSeverity
  rule: string
  message: string
  suggestion: string?
  autoFixable: bool
  category: IssueCategory
}

// Issue category enumeration
enum IssueCategory {
  STYLE
  COMPLEXITY
  MAINTAINABILITY
  RELIABILITY
  SECURITY
  PERFORMANCE
  DOCUMENTATION
  TESTING
}

// Code metrics schema
class CodeMetrics {
  linesOfCode: int
  cyclomaticComplexity: float
  cognitiveComplexity: float
  maintainabilityIndex: float
  duplicateCodeRatio: float
  testCoverage: float?
  technicalDebt: TechnicalDebt
}

// Technical debt schema
class TechnicalDebt {
  total: float @description("Total debt in hours")
  byCategory: DebtByCategory[]
  trend: TrendDirection
  paybackRatio: float @description("Debt vs development time ratio")
}

// Debt by category schema
class DebtByCategory {
  category: IssueCategory
  hours: float
  issueCount: int
  priority: Priority
}

// Code suggestion schema
class CodeSuggestion {
  id: string
  file: string
  startLine: int
  endLine: int
  type: SuggestionType
  description: string
  benefit: string
  example: string?
  effort: EffortLevel
  impact: ImpactLevel
}

// Suggestion type enumeration
enum SuggestionType {
  REFACTORING
  OPTIMIZATION
  MODERNIZATION
  SIMPLIFICATION
  DOCUMENTATION
  TEST_IMPROVEMENT
  SECURITY_ENHANCEMENT
}

// Impact level enumeration
enum ImpactLevel {
  HIGH
  MEDIUM
  LOW
}

// Security finding schema
class SecurityFinding {
  id: string
  type: VulnerabilityType
  severity: SecuritySeverity
  confidence: ConfidenceLevel
  file: string
  line: int
  code: string
  description: string
  cwe: string?
  cve: string?
  fixGuidance: string
  references: string[]
}

// Vulnerability type enumeration
enum VulnerabilityType {
  SQL_INJECTION
  XSS
  CSRF
  XXE
  SSRF
  PATH_TRAVERSAL
  COMMAND_INJECTION
  LDAP_INJECTION
  WEAK_CRYPTO
  HARDCODED_SECRET
  INSECURE_DESERIALIZATION
  VULNERABLE_DEPENDENCY
}

// Confidence level enumeration
enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
}

// Performance finding schema
class PerformanceFinding {
  id: string
  type: PerformanceIssueType
  severity: PerformanceImpact
  file: string
  line: int
  description: string
  impact: string @description("Quantified impact")
  optimization: string
  estimatedImprovement: string
}

// Performance issue type enumeration
enum PerformanceIssueType {
  N_PLUS_ONE_QUERY
  INEFFICIENT_ALGORITHM
  MEMORY_LEAK
  BLOCKING_IO
  UNNECESSARY_COMPUTATION
  LARGE_PAYLOAD
  MISSING_INDEX
  INEFFICIENT_CACHING
}

// Approval status schema
class ApprovalStatus {
  status: ApprovalState
  approver: string?
  timestamp: string?
  conditions: ApprovalCondition[]
  comments: string?
}

// Approval state enumeration
enum ApprovalState {
  PENDING
  APPROVED
  REJECTED
  CONDITIONAL
  AUTO_APPROVED
}

// Approval condition schema
class ApprovalCondition {
  type: ConditionType
  description: string
  mustBeMetBefore: string? @description("ISO 8601 timestamp")
  status: ConditionStatus
}

// Condition type enumeration
enum ConditionType {
  FIX_CRITICAL_ISSUES
  ADD_TESTS
  UPDATE_DOCUMENTATION
  SECURITY_REVIEW
  PERFORMANCE_TEST
}

// Condition status enumeration
enum ConditionStatus {
  PENDING
  MET
  FAILED
  WAIVED
}

// Architecture review request
class ArchitectureReviewRequest {
  components: ComponentDefinition[]
  dependencies: DependencyGraph
  patterns: string[] @description("Architecture patterns used")
  constraints: ArchitecturalConstraints
}

// Component definition schema
class ComponentDefinition {
  name: string
  type: ComponentType
  responsibility: string
  interfaces: InterfaceDefinition[]
  dependencies: string[]
  metrics: ComponentMetrics
}

// Component type enumeration
enum ComponentType {
  SERVICE
  LIBRARY
  MODULE
  PACKAGE
  LAYER
  SUBSYSTEM
}

// Interface definition schema
class InterfaceDefinition {
  name: string
  type: InterfaceType
  methods: MethodSignature[]
  contracts: string @description("Interface contract description")
}

// Interface type enumeration
enum InterfaceType {
  REST_API
  GRAPHQL
  GRPC
  EVENT
  LIBRARY_API
  CLI
}

// Method signature schema
class MethodSignature {
  name: string
  parameters: string[]
  returnType: string
  description: string
}

// Component metrics schema
class ComponentMetrics {
  linesOfCode: int
  complexity: float
  cohesion: float
  coupling: float
  abstractness: float
  instability: float
}

// Dependency graph schema
class DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  cycles: DependencyCycle[]
}

// Dependency node schema
class DependencyNode {
  id: string
  name: string
  type: string
  version: string?
  internal: bool
}

// Dependency edge schema
class DependencyEdge {
  from: string
  to: string
  type: DependencyType
  strength: DependencyStrength
}

// Dependency type enumeration
enum DependencyType {
  COMPILE
  RUNTIME
  TEST
  PROVIDED
  OPTIONAL
}

// Dependency strength enumeration
enum DependencyStrength {
  STRONG
  MODERATE
  WEAK
}

// Dependency cycle schema
class DependencyCycle {
  nodes: string[]
  severity: CycleSeverity
  suggestion: string
}

// Cycle severity enumeration
enum CycleSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

// Architectural constraints schema
class ArchitecturalConstraints {
  layers: string[]
  allowedDependencies: AllowedDependency[]
  forbiddenPatterns: string[]
  requiredPatterns: string[]
}

// Allowed dependency schema
class AllowedDependency {
  from: string @description("Layer or component pattern")
  to: string @description("Layer or component pattern")
  reason: string
}

// Architecture review result
class ArchitectureReviewResult {
  summary: ArchitectureSummary
  violations: ArchitectureViolation[]
  recommendations: ArchitectureRecommendation[]
  metrics: ArchitectureMetrics
}

// Architecture summary schema
class ArchitectureSummary {
  overallScore: float @description("0-100 architecture quality score")
  patternAdherence: float @description("How well patterns are followed")
  modularity: float @description("System modularity score")
  maintainability: float @description("Maintainability score")
  recommendation: string
}

// Architecture violation schema
class ArchitectureViolation {
  type: ViolationType
  severity: IssueSeverity
  component: string
  description: string
  impact: string
  fix: string
}

// Violation type enumeration
enum ViolationType {
  LAYER_VIOLATION
  CIRCULAR_DEPENDENCY
  PATTERN_VIOLATION
  COUPLING_VIOLATION
  COHESION_VIOLATION
}

// Architecture recommendation schema
class ArchitectureRecommendation {
  type: ArchRecommendationType
  priority: Priority
  description: string
  benefit: string
  effort: EffortLevel
  example: string?
}

// Architecture recommendation type enumeration
enum ArchRecommendationType {
  EXTRACT_SERVICE
  INTRODUCE_ABSTRACTION
  BREAK_DEPENDENCY
  APPLY_PATTERN
  MERGE_COMPONENTS
  SPLIT_COMPONENT
}

// Architecture metrics schema
class ArchitectureMetrics {
  componentCount: int
  averageCoupling: float
  averageCohesion: float
  abstractnessInstabilityDistance: float
  cyclomaticComplexityAverage: float
  technicalDebtRatio: float
}

// Function to perform comprehensive code review
function performCodeReview(request: CodeReviewRequest) -> CodeReviewResult {
  client claude-opus
  prompt #"
    Perform comprehensive code review for:
    
    Files: {{ request.files | length }}
    Review Type: {{ request.reviewType }}
    {% if request.pullRequest %}
    PR: #{{ request.pullRequest.number }} - {{ request.pullRequest.title }}
    {% endif %}
    
    Standards:
    - Style Guide: {{ request.standards.styleGuide }}
    - Max Complexity: {{ request.standards.complexityThresholds.cyclomaticComplexity }}
    - Documentation Required: {{ request.standards.documentationRequirements.requireFunctionDocs }}
    
    Review for:
    1. Code quality and maintainability
    2. Best practices and patterns
    3. Performance issues
    4. Security vulnerabilities
    5. Test coverage
    6. Documentation completeness
    
    For each issue found:
    - Provide exact location
    - Explain the problem
    - Suggest a fix
    - Rate severity appropriately
    
    Calculate overall code quality score.
  "#
}

// Function to perform security analysis
function performSecurityAnalysis(
  files: CodeFileForReview[],
  config: SecurityConfig
) -> SecurityFinding[] {
  client claude-opus
  prompt #"
    Perform security analysis on {{ files | length }} files:
    
    Security Configuration:
    - Scanners: {{ config.scanners | map(attribute='name') }}
    - Compliance: {{ config.complianceStandards }}
    
    Scan for:
    1. OWASP Top 10 vulnerabilities
    2. Hardcoded secrets and credentials
    3. Insecure coding patterns
    4. Vulnerable dependencies
    5. Input validation issues
    6. Authentication/authorization flaws
    
    For each finding:
    - Identify exact location and code
    - Classify vulnerability type and severity
    - Provide CWE/CVE references if applicable
    - Suggest secure code fix
    - Include references for remediation
    
    Focus on HIGH confidence findings to minimize false positives.
  "#
}

// Function to analyze code architecture
function analyzeArchitecture(request: ArchitectureReviewRequest) -> ArchitectureReviewResult {
  client claude-opus
  prompt #"
    Analyze software architecture:
    
    Components: {{ request.components | length }}
    Patterns: {{ request.patterns }}
    Dependencies: {{ request.dependencies.nodes | length }} nodes, {{ request.dependencies.edges | length }} edges
    
    Constraints:
    - Layers: {{ request.constraints.layers }}
    - Required Patterns: {{ request.constraints.requiredPatterns }}
    
    Analyze for:
    1. Architecture pattern compliance
    2. Dependency violations and cycles
    3. Component coupling and cohesion
    4. Modularity and maintainability
    5. Technical debt accumulation
    
    Provide:
    - Overall architecture quality score
    - Specific violations with fixes
    - Improvement recommendations
    - Refactoring suggestions
    
    Consider long-term maintainability and scalability.
  "#
}
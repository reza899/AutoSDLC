// PM Agent GitHub operation schemas for AutoSDLC
// These schemas define GitHub API interactions for the Product Manager agent

// GitHub issue creation request
class GitHubIssueRequest {
  title: string @description("Issue title, max 256 characters")
  body: string @description("Issue description in Markdown")
  labels: string[] @description("Labels to apply to the issue")
  assignees: string[] @description("GitHub usernames to assign")
  milestone: int? @description("Milestone number to associate")
  projectId: string? @description("GitHub project ID")
}

// GitHub issue response
class GitHubIssue {
  id: int
  number: int
  title: string
  body: string
  state: IssueState
  labels: GitHubLabel[]
  assignees: GitHubUser[]
  createdAt: string @description("ISO 8601 timestamp")
  updatedAt: string @description("ISO 8601 timestamp")
  url: string
  htmlUrl: string
}

// Issue state enumeration
enum IssueState {
  OPEN
  CLOSED
}

// GitHub label schema
class GitHubLabel {
  id: int
  name: string
  color: string
  description: string?
}

// GitHub user schema
class GitHubUser {
  id: int
  login: string
  avatarUrl: string
  type: UserType
}

// User type enumeration
enum UserType {
  USER
  ORGANIZATION
  BOT
}

// Pull request creation request
class GitHubPullRequestRequest {
  title: string @description("PR title, max 256 characters")
  body: string @description("PR description in Markdown")
  head: string @description("Branch name containing changes")
  base: string @description("Target branch name")
  draft: bool @description("Create as draft PR")
  maintainerCanModify: bool
  labels: string[]
  assignees: string[]
  reviewers: string[]
}

// Pull request response
class GitHubPullRequest {
  id: int
  number: int
  title: string
  body: string
  state: PullRequestState
  draft: bool
  head: GitBranchInfo
  base: GitBranchInfo
  mergeable: bool?
  mergeableState: MergeableState?
  createdAt: string
  updatedAt: string
  mergedAt: string?
  url: string
  htmlUrl: string
}

// Pull request state enumeration
enum PullRequestState {
  OPEN
  CLOSED
  MERGED
}

// Mergeable state enumeration
enum MergeableState {
  CLEAN
  DIRTY
  UNKNOWN
  BLOCKED
  BEHIND
  UNSTABLE
  HAS_HOOKS
}

// Git branch information
class GitBranchInfo {
  ref: string @description("Branch name")
  sha: string @description("Commit SHA")
  repo: GitHubRepository
}

// GitHub repository schema
class GitHubRepository {
  id: int
  name: string
  fullName: string
  owner: GitHubUser
  private: bool
  defaultBranch: string
  url: string
  cloneUrl: string
}

// Technical specification generation
class TechnicalSpecRequest {
  requirements: string @description("User requirements text")
  projectContext: ProjectContext
  constraints: TechnicalConstraints
  existingCodebase: CodebaseInfo?
}

// Project context for spec generation
class ProjectContext {
  projectName: string
  projectType: ProjectType
  targetAudience: string
  businessGoals: string[]
  successMetrics: string[]
}

// Project type enumeration
enum ProjectType {
  WEB_APPLICATION
  MOBILE_APP
  API_SERVICE
  LIBRARY
  CLI_TOOL
  MICROSERVICE
  FULL_STACK
}

// Technical constraints
class TechnicalConstraints {
  programmingLanguages: string[]
  frameworks: string[]
  databases: string[]
  deploymentTargets: string[]
  performanceRequirements: PerformanceRequirements?
  securityRequirements: string[]
}

// Performance requirements
class PerformanceRequirements {
  responseTimeMs: int
  throughputRps: int
  concurrentUsers: int
  uptimePercent: float
}

// Codebase information
class CodebaseInfo {
  repositoryUrl: string
  mainBranch: string
  languages: LanguageStats[]
  dependencies: string[]
  testCoverage: float?
}

// Language statistics
class LanguageStats {
  language: string
  percentage: float
  linesOfCode: int
}

// Technical specification output
class TechnicalSpecification {
  overview: string
  functionalRequirements: Requirement[]
  nonFunctionalRequirements: Requirement[]
  architecture: ArchitectureDesign
  dataModel: DataModelDesign
  apiDesign: APIDesign?
  testingStrategy: TestingStrategy
  deploymentStrategy: DeploymentStrategy
  timeline: ProjectTimeline
}

// Requirement schema
class Requirement {
  id: string
  title: string
  description: string
  priority: RequirementPriority
  acceptanceCriteria: string[]
  dependencies: string[]
}

// Requirement priority enumeration
enum RequirementPriority {
  MUST_HAVE
  SHOULD_HAVE
  COULD_HAVE
  WONT_HAVE
}

// Architecture design schema
class ArchitectureDesign {
  pattern: string @description("e.g., MVC, Microservices, Serverless")
  components: ComponentDesign[]
  integrations: IntegrationPoint[]
  scalabilityConsiderations: string[]
}

// Component design schema
class ComponentDesign {
  name: string
  responsibility: string
  technology: string
  interfaces: string[]
  dependencies: string[]
}

// Integration point schema
class IntegrationPoint {
  name: string
  type: string @description("e.g., REST API, Message Queue, Database")
  protocol: string
  authentication: string
  dataFormat: string
}

// Data model design schema
class DataModelDesign {
  entities: EntityDesign[]
  relationships: RelationshipDesign[]
  indexes: IndexDesign[]
}

// Entity design schema
class EntityDesign {
  name: string
  attributes: AttributeDesign[]
  constraints: string[]
}

// Attribute design schema
class AttributeDesign {
  name: string
  type: string
  required: bool
  unique: bool
  defaultValue: string?
}

// Relationship design schema
class RelationshipDesign {
  from: string
  to: string
  type: RelationshipType
  cascade: bool
}

// Relationship type enumeration
enum RelationshipType {
  ONE_TO_ONE
  ONE_TO_MANY
  MANY_TO_ONE
  MANY_TO_MANY
}

// Index design schema
class IndexDesign {
  name: string
  entity: string
  attributes: string[]
  unique: bool
  type: string @description("e.g., BTREE, HASH, GIN")
}

// API design schema
class APIDesign {
  style: APIStyle
  endpoints: EndpointDesign[]
  authentication: AuthenticationDesign
  rateLimiting: RateLimitDesign?
  documentation: APIDocumentationPlan
}

// API style enumeration
enum APIStyle {
  REST
  GRAPHQL
  GRPC
  SOAP
}

// Endpoint design schema
class EndpointDesign {
  path: string
  method: string
  description: string
  requestSchema: string
  responseSchema: string
  errorResponses: ErrorResponse[]
}

// Error response schema
class ErrorResponse {
  statusCode: int
  errorCode: string
  description: string
}

// Authentication design schema
class AuthenticationDesign {
  method: string @description("e.g., JWT, OAuth2, API Key")
  tokenLifetime: int?
  refreshStrategy: string?
  scopes: string[]
}

// Rate limit design schema
class RateLimitDesign {
  requestsPerMinute: int
  burstLimit: int
  byUser: bool
  byIP: bool
}

// API documentation plan
class APIDocumentationPlan {
  format: string @description("e.g., OpenAPI, GraphQL Schema")
  interactiveDocs: bool
  exampleRequests: bool
  sdkGeneration: bool
}

// Testing strategy schema
class TestingStrategy {
  unitTestFramework: string
  integrationTestApproach: string
  e2eTestFramework: string?
  coverageTarget: int
  performanceTestPlan: string?
  securityTestPlan: string?
}

// Deployment strategy schema
class DeploymentStrategy {
  platform: string @description("e.g., AWS, GCP, Azure, Kubernetes")
  cicdPipeline: string @description("e.g., GitHub Actions, Jenkins")
  environments: Environment[]
  rollbackStrategy: string
  monitoringTools: string[]
}

// Environment schema
class Environment {
  name: string
  purpose: string
  configuration: string[]
  approvers: string[]
}

// Project timeline schema
class ProjectTimeline {
  phases: ProjectPhase[]
  totalDuration: int @description("Duration in days")
  criticalPath: string[]
}

// Project phase schema
class ProjectPhase {
  name: string
  description: string
  duration: int @description("Duration in days")
  deliverables: string[]
  dependencies: string[]
  assignedAgent: AgentType
}

// Function to create GitHub issue from requirements
function createGitHubIssueFromRequirements(
  requirements: string,
  projectContext: ProjectContext
) -> GitHubIssueRequest {
  client claude-opus
  prompt #"
    Create a GitHub issue from the following requirements:
    
    Requirements: {{ requirements }}
    
    Project: {{ projectContext.projectName }}
    Type: {{ projectContext.projectType }}
    Goals: {{ projectContext.businessGoals }}
    
    Generate an issue with:
    1. Clear, actionable title (max 100 chars)
    2. Detailed description with acceptance criteria
    3. Appropriate labels based on project type
    4. Suggested assignees if mentioned in requirements
    
    Format the body in GitHub-flavored Markdown with:
    - Overview section
    - Acceptance Criteria checklist
    - Technical Notes section
    - Related Issues section
  "#
}

// Function to generate technical specification
function generateTechnicalSpecification(
  request: TechnicalSpecRequest
) -> TechnicalSpecification {
  client claude-opus
  prompt #"
    Generate a comprehensive technical specification for:
    
    Requirements: {{ request.requirements }}
    Project Type: {{ request.projectContext.projectType }}
    Business Goals: {{ request.projectContext.businessGoals }}
    
    Constraints:
    - Languages: {{ request.constraints.programmingLanguages }}
    - Frameworks: {{ request.constraints.frameworks }}
    - Databases: {{ request.constraints.databases }}
    
    {% if request.existingCodebase %}
    Existing Codebase:
    - Repository: {{ request.existingCodebase.repositoryUrl }}
    - Languages: {{ request.existingCodebase.languages }}
    - Test Coverage: {{ request.existingCodebase.testCoverage }}%
    {% endif %}
    
    Create a detailed specification including:
    1. Functional and non-functional requirements
    2. Architecture design with component breakdown
    3. Data model with entities and relationships
    4. API design (if applicable)
    5. Testing strategy with coverage targets
    6. Deployment strategy
    7. Project timeline with phases
    
    Ensure all designs follow best practices for the specified technology stack.
  "#
}

// Function to create pull request from completed work
function createPullRequestFromWork(
  branchName: string,
  workSummary: string,
  issueNumber: int,
  testResults: string
) -> GitHubPullRequestRequest {
  client claude-sonnet
  prompt #"
    Create a pull request for the following completed work:
    
    Branch: {{ branchName }}
    Related Issue: #{{ issueNumber }}
    Work Summary: {{ workSummary }}
    Test Results: {{ testResults }}
    
    Generate:
    1. Clear PR title referencing the issue
    2. Detailed description with:
       - Summary of changes
       - Testing performed
       - Screenshots/examples if applicable
       - Checklist of completed items
    3. Appropriate labels
    4. Suggested reviewers based on code changes
    
    Format using GitHub PR template conventions.
  "#
}

// Function to validate technical specification completeness
function validateTechnicalSpec(spec: TechnicalSpecification) -> ValidationResult {
  client claude-sonnet
  prompt #"
    Validate the completeness of this technical specification:
    
    Overview: {{ spec.overview }}
    Functional Requirements: {{ spec.functionalRequirements | length }} items
    Architecture Pattern: {{ spec.architecture.pattern }}
    Data Entities: {{ spec.dataModel.entities | length }}
    Timeline: {{ spec.timeline.totalDuration }} days
    
    Check for:
    1. All requirements have acceptance criteria
    2. Architecture components have clear interfaces
    3. Data model relationships are properly defined
    4. Timeline phases have realistic durations
    5. Testing strategy covers all components
    
    Return validation result with any missing elements.
  "#
}

// Validation result schema
class ValidationResult {
  valid: bool
  missingElements: string[]
  warnings: string[]
  suggestions: string[]
}
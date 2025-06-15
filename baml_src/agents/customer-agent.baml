// Customer Agent requirements analysis schemas for AutoSDLC
// These schemas define requirement gathering, validation, and analysis workflows

// Raw requirements input
class RawRequirementsInput {
  description: string @description("User's description of what they want")
  domain: BusinessDomain? @description("Business domain if specified")
  constraints: string[]? @description("Known constraints or limitations")
  existingSystem: string? @description("Description of existing system")
  stakeholders: string[]? @description("Key stakeholders or user types")
  timeline: string? @description("Desired timeline or deadlines")
  budget: string? @description("Budget constraints if mentioned")
}

// Business domain enumeration
enum BusinessDomain {
  E_COMMERCE
  HEALTHCARE
  FINTECH
  EDUCATION
  ENTERPRISE
  CONSUMER_APP
  GAMING
  MEDIA
  LOGISTICS
  REAL_ESTATE
  OTHER
}

// Requirements analysis request
class RequirementsAnalysisRequest {
  rawInput: RawRequirementsInput
  analysisDepth: AnalysisDepth
  includeUserStories: bool @default(true)
  includeAcceptanceCriteria: bool @default(true)
  suggestTechnicalSpecs: bool @default(false)
}

// Analysis depth enumeration
enum AnalysisDepth {
  QUICK_SCAN
  STANDARD
  COMPREHENSIVE
  DETAILED_WITH_RESEARCH
}

// Analyzed requirements output
class AnalyzedRequirements {
  summary: RequirementsSummary
  functionalRequirements: FunctionalRequirement[]
  nonFunctionalRequirements: NonFunctionalRequirement[]
  userStories: UserStory[]?
  acceptanceCriteria: AcceptanceCriteria[]?
  assumptions: string[]
  risks: Risk[]
  clarificationQuestions: ClarificationQuestion[]
  recommendedNextSteps: string[]
}

// Requirements summary schema
class RequirementsSummary {
  projectTitle: string
  projectDescription: string
  businessDomain: BusinessDomain
  primaryGoals: string[]
  targetUsers: string[]
  keyFeatures: string[]
  complexity: ComplexityLevel
  estimatedDuration: EstimatedDuration
  businessValue: BusinessValue
}

// Complexity level enumeration
enum ComplexityLevel {
  SIMPLE
  MODERATE
  COMPLEX
  VERY_COMPLEX
  ENTERPRISE_LEVEL
}

// Estimated duration schema
class EstimatedDuration {
  minimum: int @description("Minimum weeks")
  maximum: int @description("Maximum weeks")
  mostLikely: int @description("Most likely weeks")
  confidence: ConfidenceLevel
}

// Confidence level enumeration (reused from other schemas)
enum ConfidenceLevel {
  LOW
  MEDIUM
  HIGH
  VERY_HIGH
}

// Business value schema
class BusinessValue {
  revenue_impact: RevenueImpact
  cost_savings: CostSavings?
  user_experience: UserExperienceValue
  strategic_value: StrategicValue
  risk_mitigation: RiskMitigation?
}

// Revenue impact schema
class RevenueImpact {
  category: RevenueCategory
  estimated_amount: string? @description("If quantifiable")
  confidence: ConfidenceLevel
  timeframe: string @description("When impact expected")
}

// Revenue category enumeration
enum RevenueCategory {
  DIRECT_REVENUE
  COST_REDUCTION
  EFFICIENCY_GAIN
  CUSTOMER_RETENTION
  MARKET_EXPANSION
  NONE
}

// Cost savings schema
class CostSavings {
  category: CostSavingsCategory
  estimated_amount: string?
  confidence: ConfidenceLevel
  timeframe: string
}

// Cost savings category enumeration
enum CostSavingsCategory {
  AUTOMATION
  PROCESS_IMPROVEMENT
  RESOURCE_OPTIMIZATION
  MAINTENANCE_REDUCTION
  THIRD_PARTY_ELIMINATION
}

// User experience value schema
class UserExperienceValue {
  improvement_areas: string[]
  impact_level: ImpactLevel
  user_satisfaction_expected: int @description("Expected satisfaction score 1-10")
}

// Strategic value schema
class StrategicValue {
  alignment: StrategicAlignment
  competitive_advantage: CompetitiveAdvantage?
  future_opportunities: string[]
}

// Strategic alignment enumeration
enum StrategicAlignment {
  HIGH
  MEDIUM
  LOW
  UNCLEAR
}

// Competitive advantage schema
class CompetitiveAdvantage {
  type: AdvantageType
  description: string
  sustainability: AdvantageSustainability
}

// Advantage type enumeration
enum AdvantageType {
  FIRST_MOVER
  COST_ADVANTAGE
  FEATURE_SUPERIORITY
  USER_EXPERIENCE
  TECHNICAL_INNOVATION
  MARKET_POSITION
}

// Advantage sustainability enumeration
enum AdvantageSustainability {
  SHORT_TERM
  MEDIUM_TERM
  LONG_TERM
  SUSTAINABLE
}

// Risk mitigation schema
class RiskMitigation {
  risks_addressed: string[]
  mitigation_level: MitigationLevel
  confidence: ConfidenceLevel
}

// Mitigation level enumeration
enum MitigationLevel {
  MINIMAL
  MODERATE
  SIGNIFICANT
  COMPREHENSIVE
}

// Functional requirement schema
class FunctionalRequirement {
  id: string
  title: string
  description: string
  category: RequirementCategory
  priority: RequirementPriority
  complexity: RequirementComplexity
  dependencies: string[]
  relatedUserStories: string[]?
}

// Requirement category enumeration
enum RequirementCategory {
  USER_INTERFACE
  BUSINESS_LOGIC
  DATA_MANAGEMENT
  INTEGRATION
  SECURITY
  REPORTING
  COMMUNICATION
  WORKFLOW
}

// Requirement priority enumeration (reused from PM agent)
enum RequirementPriority {
  MUST_HAVE
  SHOULD_HAVE
  COULD_HAVE
  WONT_HAVE
}

// Requirement complexity enumeration
enum RequirementComplexity {
  TRIVIAL
  SIMPLE
  MODERATE
  COMPLEX
  VERY_COMPLEX
}

// Non-functional requirement schema
class NonFunctionalRequirement {
  id: string
  title: string
  description: string
  type: NonFunctionalType
  measurableTargets: MeasurableTarget[]
  priority: RequirementPriority
  testStrategy: string?
}

// Non-functional type enumeration
enum NonFunctionalType {
  PERFORMANCE
  SCALABILITY
  SECURITY
  USABILITY
  RELIABILITY
  AVAILABILITY
  MAINTAINABILITY
  COMPATIBILITY
  COMPLIANCE
}

// Measurable target schema
class MeasurableTarget {
  metric: string
  target: string
  measurement_method: string
  baseline: string?
}

// User story schema
class UserStory {
  id: string
  title: string
  asA: string @description("User role")
  iWant: string @description("Goal/desire")
  soThat: string @description("Benefit/reason")
  acceptanceCriteria: string[]
  priority: RequirementPriority
  complexity: StoryComplexity
  epic: string? @description("Epic this story belongs to")
}

// Story complexity enumeration
enum StoryComplexity {
  XS
  S
  M
  L
  XL
  XXL
}

// Acceptance criteria schema
class AcceptanceCriteria {
  requirementId: string
  criteria: AcceptanceCriterion[]
  testingApproach: TestingApproach
}

// Acceptance criterion schema
class AcceptanceCriterion {
  id: string
  given: string @description("Precondition")
  when: string @description("Action")
  then: string @description("Expected result")
  priority: CriteriaPriority
}

// Criteria priority enumeration
enum CriteriaPriority {
  CRITICAL
  IMPORTANT
  NICE_TO_HAVE
}

// Testing approach schema
class TestingApproach {
  manual_testing: bool
  automated_testing: bool
  user_acceptance_testing: bool
  performance_testing: bool
  security_testing: bool
  accessibility_testing: bool
}

// Risk schema
class Risk {
  id: string
  title: string
  description: string
  category: RiskCategory
  probability: RiskProbability
  impact: RiskImpact
  mitigation_strategies: MitigationStrategy[]
  owner: string? @description("Who should manage this risk")
}

// Risk category enumeration
enum RiskCategory {
  TECHNICAL
  BUSINESS
  RESOURCE
  TIMELINE
  BUDGET
  MARKET
  REGULATORY
  SECURITY
}

// Risk probability enumeration
enum RiskProbability {
  VERY_LOW
  LOW
  MEDIUM
  HIGH
  VERY_HIGH
}

// Risk impact enumeration
enum RiskImpact {
  NEGLIGIBLE
  MINOR
  MODERATE
  MAJOR
  SEVERE
}

// Mitigation strategy schema
class MitigationStrategy {
  type: MitigationType
  description: string
  cost: string?
  timeline: string?
  effectiveness: EffectivenessRating
}

// Mitigation type enumeration
enum MitigationType {
  AVOID
  MITIGATE
  TRANSFER
  ACCEPT
  MONITOR
}

// Effectiveness rating enumeration
enum EffectivenessRating {
  LOW
  MEDIUM
  HIGH
  VERY_HIGH
}

// Clarification question schema
class ClarificationQuestion {
  id: string
  question: string
  category: QuestionCategory
  importance: QuestionImportance
  relatedRequirements: string[]
  suggestedAnswers: string[]?
}

// Question category enumeration
enum QuestionCategory {
  FUNCTIONAL_SCOPE
  NON_FUNCTIONAL_REQUIREMENTS
  USER_EXPERIENCE
  TECHNICAL_CONSTRAINTS
  BUSINESS_RULES
  INTEGRATION_REQUIREMENTS
  DATA_REQUIREMENTS
  COMPLIANCE_REQUIREMENTS
}

// Question importance enumeration
enum QuestionImportance {
  BLOCKING
  HIGH
  MEDIUM
  LOW
  NICE_TO_KNOW
}

// Requirements validation request
class RequirementsValidationRequest {
  requirements: AnalyzedRequirements
  validationCriteria: ValidationCriteria
  industryStandards: IndustryStandard[]?
  existingSystemConstraints: SystemConstraint[]?
}

// Validation criteria schema
class ValidationCriteria {
  completeness: bool @default(true)
  consistency: bool @default(true)
  feasibility: bool @default(true)
  testability: bool @default(true)
  traceability: bool @default(true)
  clarity: bool @default(true)
}

// Industry standard schema
class IndustryStandard {
  name: string
  description: string
  relevantAreas: string[]
  complianceLevel: ComplianceLevel
}

// Compliance level enumeration
enum ComplianceLevel {
  MANDATORY
  RECOMMENDED
  OPTIONAL
  NOT_APPLICABLE
}

// System constraint schema
class SystemConstraint {
  type: ConstraintType
  description: string
  impact: ConstraintImpact
  workarounds: string[]?
}

// Constraint type enumeration
enum ConstraintType {
  TECHNICAL
  BUSINESS
  LEGAL
  BUDGET
  TIMELINE
  RESOURCE
  INTEGRATION
}

// Constraint impact enumeration
enum ConstraintImpact {
  BLOCKING
  HIGH_IMPACT
  MEDIUM_IMPACT
  LOW_IMPACT
  NEGLIGIBLE
}

// Requirements validation result
class RequirementsValidationResult {
  overallScore: float @description("0-100 validation score")
  validationResults: ValidationResult[]
  issues: ValidationIssue[]
  recommendations: ValidationRecommendation[]
  readinessAssessment: ReadinessAssessment
}

// Validation result schema
class ValidationResult {
  criteria: string
  passed: bool
  score: float @description("0-100 score for this criteria")
  details: string
  evidence: string[]
}

// Validation issue schema
class ValidationIssue {
  id: string
  severity: IssueSeverity
  category: IssueCategory
  description: string
  affectedRequirements: string[]
  suggestedFix: string
  effort: EffortLevel
}

// Validation recommendation schema
class ValidationRecommendation {
  type: RecommendationType
  description: string
  benefit: string
  effort: EffortLevel
  priority: Priority
}

// Readiness assessment schema
class ReadinessAssessment {
  overallReadiness: ReadinessLevel
  readyToProceed: bool
  blockers: string[]
  prerequisites: string[]
  recommendedActions: string[]
  estimatedTimeToReady: string?
}

// Readiness level enumeration
enum ReadinessLevel {
  NOT_READY
  PARTIALLY_READY
  MOSTLY_READY
  READY
  WELL_PREPARED
}

// Function to analyze raw requirements
function analyzeRequirements(request: RequirementsAnalysisRequest) -> AnalyzedRequirements {
  client claude-opus
  prompt #"
    Analyze the following raw requirements with {{ request.analysisDepth }} depth:
    
    Description: {{ request.rawInput.description }}
    Domain: {{ request.rawInput.domain }}
    Constraints: {{ request.rawInput.constraints }}
    Stakeholders: {{ request.rawInput.stakeholders }}
    Timeline: {{ request.rawInput.timeline }}
    Budget: {{ request.rawInput.budget }}
    
    {% if request.rawInput.existingSystem %}
    Existing System: {{ request.rawInput.existingSystem }}
    {% endif %}
    
    Provide comprehensive analysis including:
    1. Clear project summary with business domain classification
    2. Detailed functional and non-functional requirements
    3. Well-defined user stories with acceptance criteria
    4. Risk assessment with mitigation strategies
    5. Business value estimation
    6. Clarification questions for unclear areas
    7. Recommended next steps
    
    {% if request.includeUserStories %}
    Include user stories in "As a [role], I want [goal] so that [benefit]" format.
    {% endif %}
    
    {% if request.includeAcceptanceCriteria %}
    Include acceptance criteria in Given-When-Then format.
    {% endif %}
    
    Focus on:
    - Identifying gaps and ambiguities
    - Suggesting realistic timelines and complexity estimates
    - Highlighting business value and ROI potential
    - Ensuring requirements are testable and measurable
  "#
}

// Function to validate requirements completeness and quality
function validateRequirements(request: RequirementsValidationRequest) -> RequirementsValidationResult {
  client claude-opus
  prompt #"
    Validate the following analyzed requirements for quality and completeness:
    
    Requirements Summary:
    - Project: {{ request.requirements.summary.projectTitle }}
    - Domain: {{ request.requirements.summary.businessDomain }}
    - Complexity: {{ request.requirements.summary.complexity }}
    - Functional Requirements: {{ request.requirements.functionalRequirements | length }}
    - Non-Functional Requirements: {{ request.requirements.nonFunctionalRequirements | length }}
    - User Stories: {{ request.requirements.userStories | length if request.requirements.userStories else 0 }}
    
    Validation Criteria:
    - Completeness: {{ request.validationCriteria.completeness }}
    - Consistency: {{ request.validationCriteria.consistency }}
    - Feasibility: {{ request.validationCriteria.feasibility }}
    - Testability: {{ request.validationCriteria.testability }}
    - Traceability: {{ request.validationCriteria.traceability }}
    - Clarity: {{ request.validationCriteria.clarity }}
    
    {% if request.industryStandards %}
    Industry Standards to Consider:
    {% for standard in request.industryStandards %}
    - {{ standard.name }}: {{ standard.description }}
    {% endfor %}
    {% endif %}
    
    Validate for:
    1. Requirement completeness and coverage
    2. Internal consistency and no contradictions
    3. Technical and business feasibility
    4. Testability and measurability
    5. Clear traceability between components
    6. Clarity and unambiguous language
    
    Provide:
    - Overall validation score (0-100)
    - Specific issues found with severity and fixes
    - Recommendations for improvement
    - Readiness assessment for proceeding to design phase
    
    Be thorough but practical in recommendations.
  "#
}

// Function to generate clarification questions for ambiguous requirements
function generateClarificationQuestions(
  requirements: AnalyzedRequirements,
  focusAreas: QuestionCategory[]
) -> ClarificationQuestion[] {
  client claude-sonnet
  prompt #"
    Generate clarification questions for the following requirements:
    
    Project: {{ requirements.summary.projectTitle }}
    Functional Requirements: {{ requirements.functionalRequirements | length }}
    Risks Identified: {{ requirements.risks | length }}
    
    Focus Areas: {{ focusAreas }}
    
    Generate questions that:
    1. Address ambiguities in requirements
    2. Clarify business rules and logic
    3. Understand user workflows better
    4. Identify integration touchpoints
    5. Clarify non-functional requirements
    6. Understand constraints better
    
    For each question:
    - Make it specific and actionable
    - Explain why the answer is important
    - Suggest possible answers if helpful
    - Prioritize by impact on project success
    
    Focus on questions that will significantly impact design and implementation decisions.
  "#
}

// Function to estimate project complexity and effort
function estimateProjectEffort(
  requirements: AnalyzedRequirements,
  teamSize: int,
  experienceLevel: ExperienceLevel
) -> EffortEstimation {
  client claude-opus
  prompt #"
    Estimate effort for project based on analyzed requirements:
    
    Requirements Summary:
    - Functional Requirements: {{ requirements.functionalRequirements | length }}
    - Non-Functional Requirements: {{ requirements.nonFunctionalRequirements | length }}
    - User Stories: {{ requirements.userStories | length if requirements.userStories else 0 }}
    - Complexity: {{ requirements.summary.complexity }}
    - Risks: {{ requirements.risks | length }}
    
    Team Context:
    - Team Size: {{ teamSize }}
    - Experience Level: {{ experienceLevel }}
    
    Provide estimation for:
    1. Development effort (hours/weeks)
    2. Testing effort
    3. Deployment and DevOps setup
    4. Documentation and training
    5. Risk mitigation buffer
    
    Consider:
    - Requirement complexity and dependencies
    - Team experience with similar projects
    - Technology stack learning curve
    - Integration complexity
    - Quality and testing requirements
    
    Provide optimistic, realistic, and pessimistic estimates.
  "#
}

// Experience level enumeration
enum ExperienceLevel {
  JUNIOR
  INTERMEDIATE
  SENIOR
  EXPERT
}

// Effort estimation schema
class EffortEstimation {
  development: EffortRange
  testing: EffortRange
  devops: EffortRange
  documentation: EffortRange
  riskBuffer: EffortRange
  total: EffortRange
  assumptions: string[]
  riskFactors: string[]
  recommendations: string[]
}

// Effort range schema
class EffortRange {
  optimistic: float @description("Person-weeks")
  realistic: float @description("Person-weeks")
  pessimistic: float @description("Person-weeks")
  confidence: ConfidenceLevel
}
// Coder Agent file operation and TDD schemas for AutoSDLC
// These schemas define code generation and test-driven development workflows

// Test specification from requirements
class TestSpecificationRequest {
  requirements: Requirement[]
  technicalSpec: TechnicalSpecification
  testingFramework: TestFramework
  language: ProgrammingLanguage
  existingTests: TestFile[]?
}

// Test framework enumeration
enum TestFramework {
  JEST
  VITEST
  MOCHA
  PYTEST
  JUNIT
  RSPEC
  GO_TEST
  DOTNET_TEST
}

// Programming language enumeration
enum ProgrammingLanguage {
  TYPESCRIPT
  JAVASCRIPT
  PYTHON
  JAVA
  GO
  CSHARP
  RUBY
  RUST
}

// Test file schema
class TestFile {
  path: string
  content: string
  framework: TestFramework
  coverageTargets: CoverageTargets
}

// Coverage targets schema
class CoverageTargets {
  line: int @description("Line coverage percentage target")
  branch: int @description("Branch coverage percentage target")
  function: int @description("Function coverage percentage target")
  statement: int @description("Statement coverage percentage target")
}

// Test specification output
class TestSpecification {
  testFiles: GeneratedTestFile[]
  testSuites: TestSuite[]
  setupInstructions: string[]
  runCommand: string
  coverageCommand: string
  expectedFailures: ExpectedTestFailure[]
}

// Generated test file schema
class GeneratedTestFile {
  path: string
  content: string
  description: string
  testCount: int
  dependencies: string[]
}

// Test suite schema
class TestSuite {
  name: string
  description: string
  testCases: TestCase[]
  beforeEach: string?
  afterEach: string?
  setupCode: string?
  teardownCode: string?
}

// Test case schema
class TestCase {
  name: string
  description: string
  given: string @description("Test preconditions")
  when: string @description("Action being tested")
  then: string @description("Expected outcome")
  testCode: string
  expectedToFail: bool
  category: TestCategory
}

// Test category enumeration
enum TestCategory {
  UNIT
  INTEGRATION
  E2E
  PERFORMANCE
  SECURITY
  SMOKE
  REGRESSION
}

// Expected test failure schema
class ExpectedTestFailure {
  testName: string
  expectedError: string
  reason: string @description("Why this test should fail before implementation")
}

// Code implementation request
class CodeImplementationRequest {
  testFiles: TestFile[]
  failingTests: TestResult[]
  technicalSpec: TechnicalSpecification
  language: ProgrammingLanguage
  styleGuide: CodeStyleGuide?
  existingCode: CodeFile[]?
}

// Test result schema
class TestResult {
  testName: string
  status: TestStatus
  errorMessage: string?
  stackTrace: string?
  duration: float @description("Test duration in milliseconds")
  retries: int
}

// Test status enumeration
enum TestStatus {
  PASSED
  FAILED
  SKIPPED
  PENDING
  TIMEOUT
}

// Code style guide schema
class CodeStyleGuide {
  indentation: IndentationStyle
  lineLength: int
  namingConventions: NamingConventions
  importOrdering: string[]
  lintingRules: string[]
}

// Indentation style enumeration
enum IndentationStyle {
  SPACES_2
  SPACES_4
  TABS
}

// Naming conventions schema
class NamingConventions {
  variables: NamingCase
  functions: NamingCase
  classes: NamingCase
  constants: NamingCase
  files: NamingCase
}

// Naming case enumeration
enum NamingCase {
  CAMEL_CASE
  PASCAL_CASE
  SNAKE_CASE
  KEBAB_CASE
  SCREAMING_SNAKE_CASE
}

// Code file schema
class CodeFile {
  path: string
  content: string
  language: ProgrammingLanguage
  purpose: string
  exports: string[]
  imports: string[]
}

// Code implementation output
class CodeImplementation {
  implementedFiles: GeneratedCodeFile[]
  modifiedFiles: FileModification[]
  testResults: TestResult[]
  coverage: CoverageReport
  refactoringOpportunities: RefactoringOpportunity[]
}

// Generated code file schema
class GeneratedCodeFile {
  path: string
  content: string
  description: string
  linesOfCode: int
  complexity: int @description("Cyclomatic complexity")
  exports: ExportedSymbol[]
  dependencies: ImportedDependency[]
}

// Exported symbol schema
class ExportedSymbol {
  name: string
  type: SymbolType
  isDefault: bool
  documentation: string?
}

// Symbol type enumeration
enum SymbolType {
  FUNCTION
  CLASS
  INTERFACE
  TYPE
  CONSTANT
  VARIABLE
  ENUM
}

// Imported dependency schema
class ImportedDependency {
  source: string
  symbols: string[]
  isExternal: bool @description("True if from node_modules or external source")
}

// File modification schema
class FileModification {
  path: string
  originalContent: string
  modifiedContent: string
  changes: CodeChange[]
  reason: string
}

// Code change schema
class CodeChange {
  startLine: int
  endLine: int
  changeType: ChangeType
  description: string
  before: string
  after: string
}

// Change type enumeration
enum ChangeType {
  ADD
  DELETE
  MODIFY
  MOVE
  RENAME
}

// Coverage report schema
class CoverageReport {
  summary: CoverageSummary
  filesCoverage: FileCoverage[]
  uncoveredLines: UncoveredCode[]
  achievedTargets: bool
}

// Coverage summary schema
class CoverageSummary {
  lines: CoverageMetric
  branches: CoverageMetric
  functions: CoverageMetric
  statements: CoverageMetric
}

// Coverage metric schema
class CoverageMetric {
  total: int
  covered: int
  percentage: float
}

// File coverage schema
class FileCoverage {
  path: string
  lines: CoverageMetric
  branches: CoverageMetric
  functions: CoverageMetric
  statements: CoverageMetric
  uncoveredLines: int[]
}

// Uncovered code schema
class UncoveredCode {
  file: string
  startLine: int
  endLine: int
  reason: string @description("Why this code is not covered")
  suggestion: string @description("How to add test coverage")
}

// Refactoring opportunity schema
class RefactoringOpportunity {
  file: string
  startLine: int
  endLine: int
  type: RefactoringType
  description: string
  benefit: string
  effort: EffortLevel
}

// Refactoring type enumeration
enum RefactoringType {
  EXTRACT_METHOD
  EXTRACT_VARIABLE
  INLINE_METHOD
  RENAME_SYMBOL
  MOVE_METHOD
  REMOVE_DUPLICATION
  SIMPLIFY_CONDITIONAL
  EXTRACT_INTERFACE
}

// Effort level enumeration
enum EffortLevel {
  TRIVIAL
  SMALL
  MEDIUM
  LARGE
  EXTRA_LARGE
}

// File operation request
class FileOperationRequest {
  operation: FileOperation
  path: string
  content: string?
  encoding: string @default("utf8")
  createDirectories: bool @default(true)
}

// File operation enumeration
enum FileOperation {
  CREATE
  READ
  UPDATE
  DELETE
  MOVE
  COPY
  CHECK_EXISTS
}

// File operation result
class FileOperationResult {
  success: bool
  operation: FileOperation
  path: string
  error: string?
  content: string? @description("For read operations")
  metadata: FileMetadata?
}

// File metadata schema
class FileMetadata {
  size: int @description("File size in bytes")
  created: string @description("ISO 8601 timestamp")
  modified: string @description("ISO 8601 timestamp")
  permissions: string
  isDirectory: bool
  isSymlink: bool
}

// Function to generate test specifications from requirements
function generateTestSpecification(
  request: TestSpecificationRequest
) -> TestSpecification {
  client claude-opus
  prompt #"
    Generate comprehensive test specifications for:
    
    Requirements:
    {% for req in request.requirements %}
    - {{ req.title }}: {{ req.description }}
      Acceptance Criteria: {{ req.acceptanceCriteria }}
    {% endfor %}
    
    Technical Specification:
    - Architecture: {{ request.technicalSpec.architecture.pattern }}
    - Components: {{ request.technicalSpec.architecture.components | length }}
    - Test Framework: {{ request.testingFramework }}
    - Language: {{ request.language }}
    
    Generate test files following TDD principles:
    1. Tests must fail before implementation
    2. Cover all acceptance criteria
    3. Include unit, integration, and e2e tests
    4. Follow {{ request.testingFramework }} best practices
    5. Achieve 100% requirement coverage
    
    For each test:
    - Use descriptive test names
    - Follow Given-When-Then pattern
    - Include clear assertions
    - Document expected failures
    
    Ensure tests are:
    - Independent and isolated
    - Fast and reliable
    - Maintainable and clear
  "#
}

// Function to implement code from failing tests
function implementCodeFromTests(
  request: CodeImplementationRequest
) -> CodeImplementation {
  client claude-opus
  prompt #"
    Implement minimal code to make the following tests pass:
    
    Failing Tests:
    {% for test in request.failingTests %}
    - {{ test.testName }}: {{ test.errorMessage }}
    {% endfor %}
    
    Technical Specification:
    - Architecture: {{ request.technicalSpec.architecture.pattern }}
    - Language: {{ request.language }}
    
    {% if request.styleGuide %}
    Style Guide:
    - Indentation: {{ request.styleGuide.indentation }}
    - Naming: Variables({{ request.styleGuide.namingConventions.variables }}), Functions({{ request.styleGuide.namingConventions.functions }})
    {% endif %}
    
    Implementation requirements:
    1. Write MINIMAL code to pass tests (no over-engineering)
    2. Follow single responsibility principle
    3. Use clear, self-documenting code
    4. Add necessary error handling
    5. Follow the specified architecture pattern
    
    Do NOT:
    - Add features not required by tests
    - Create unnecessary abstractions
    - Implement future requirements
    
    Focus on making tests GREEN with clean, simple code.
  "#
}

// Function to analyze code for refactoring opportunities
function analyzeRefactoringOpportunities(
  files: CodeFile[],
  testCoverage: CoverageReport
) -> RefactoringOpportunity[] {
  client claude-sonnet
  prompt #"
    Analyze the following code for refactoring opportunities:
    
    Files: {{ files | length }}
    Test Coverage: {{ testCoverage.summary.lines.percentage }}%
    
    {% for file in files %}
    File: {{ file.path }}
    Lines: {{ file.content | split('\n') | length }}
    {% endfor %}
    
    Identify opportunities for:
    1. Extracting duplicate code
    2. Simplifying complex methods
    3. Improving naming clarity
    4. Reducing coupling
    5. Enhancing testability
    
    For each opportunity, provide:
    - Specific location and code
    - Type of refactoring
    - Expected benefit
    - Effort estimate
    
    Only suggest refactorings that:
    - Maintain all existing tests passing
    - Improve code quality measurably
    - Are worth the effort
  "#
}

// Function to generate file operations for code changes
function planFileOperations(
  currentFiles: CodeFile[],
  newImplementation: CodeImplementation
) -> FileOperationRequest[] {
  client claude-sonnet
  prompt #"
    Plan file operations for the following code changes:
    
    Current Files: {{ currentFiles | length }}
    New Files: {{ newImplementation.implementedFiles | length }}
    Modified Files: {{ newImplementation.modifiedFiles | length }}
    
    Generate a sequence of file operations that:
    1. Safely apply all changes
    2. Create necessary directories
    3. Handle potential conflicts
    4. Maintain atomic operations where possible
    
    Consider:
    - File creation order for dependencies
    - Backup needs for modifications
    - Directory structure requirements
    - Permission requirements
    
    Return operations in the correct execution order.
  "#
}
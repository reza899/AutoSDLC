// Base agent communication schemas for AutoSDLC
// These schemas define the core structure for all agent interactions

// Agent type enumeration
enum AgentType {
  CUSTOMER
  PRODUCT_MANAGER
  CODER
  CODE_REVIEWER
  TESTER
}

// Agent status enumeration
enum AgentStatus {
  IDLE
  INITIALIZING
  READY
  WORKING
  WAITING_FOR_DEPENDENCY
  ERROR
  COMPLETED
}

// Workflow phase enumeration
enum WorkflowPhase {
  REQUIREMENTS_ANALYSIS
  TECHNICAL_DESIGN
  TDD_TEST_CREATION
  TDD_IMPLEMENTATION
  CODE_REVIEW
  TESTING
  DEPLOYMENT
  COMPLETED
}

// Base agent status schema
class AgentStatusUpdate {
  agentId: string
  agentType: AgentType
  status: AgentStatus
  currentTask: string
  progress: int @description("Progress percentage 0-100")
  dependencies: string[] @description("Agent IDs this agent is waiting for")
  lastUpdated: string @description("ISO 8601 timestamp")
  metrics: AgentMetrics
}

// Agent performance metrics
class AgentMetrics {
  tasksCompleted: int
  errorCount: int
  averageTaskDuration: float @description("Average task duration in seconds")
  uptime: int @description("Agent uptime in seconds")
  memoryUsage: float @description("Memory usage in MB")
}

// Agent communication message
class AgentMessage {
  fromAgent: string
  toAgent: string
  messageType: MessageType
  payload: string @description("JSON-encoded message payload")
  priority: MessagePriority
  timestamp: string @description("ISO 8601 timestamp")
  correlationId: string @description("UUID for message tracking")
}

// Message type enumeration
enum MessageType {
  TASK_REQUEST
  TASK_RESPONSE
  STATUS_UPDATE
  ERROR_REPORT
  DEPENDENCY_REQUEST
  DEPENDENCY_FULFILLED
  WORKFLOW_TRANSITION
}

// Message priority enumeration
enum MessagePriority {
  LOW
  NORMAL
  HIGH
  CRITICAL
}

// Workflow coordination schema
class WorkflowStatus {
  workflowId: string
  projectId: string
  currentPhase: WorkflowPhase
  phaseProgress: int @description("Progress percentage 0-100")
  activeAgents: string[]
  completedPhases: WorkflowPhase[]
  estimatedCompletion: string @description("ISO 8601 timestamp")
  errors: WorkflowError[]
}

// Workflow error schema
class WorkflowError {
  errorId: string
  agentId: string
  phase: WorkflowPhase
  errorType: string
  message: string
  stackTrace: string?
  timestamp: string @description("ISO 8601 timestamp")
  resolved: bool
}

// Agent task request schema
class AgentTaskRequest {
  taskId: string
  taskType: string
  description: string
  inputData: string @description("JSON-encoded task input")
  requiredOutputs: string[]
  deadline: string? @description("ISO 8601 timestamp")
  priority: MessagePriority
}

// Agent task response schema
class AgentTaskResponse {
  taskId: string
  status: TaskStatus
  outputs: string @description("JSON-encoded task outputs")
  errors: string[]
  executionTime: float @description("Execution time in seconds")
  resourcesUsed: ResourceUsage
}

// Task status enumeration
enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}

// Resource usage tracking
class ResourceUsage {
  cpuSeconds: float
  memoryMB: float
  apiCalls: int
  tokensUsed: int?
}

// Function to validate agent status updates
function validateAgentStatus(status: AgentStatusUpdate) -> bool {
  client claude-opus
  prompt #"
    Validate the following agent status update for consistency and completeness:
    
    Agent: {{ status.agentId }} ({{ status.agentType }})
    Status: {{ status.status }}
    Current Task: {{ status.currentTask }}
    Progress: {{ status.progress }}%
    Dependencies: {{ status.dependencies }}
    
    Check that:
    1. Progress percentage is valid (0-100)
    2. Status matches the current task state
    3. Dependencies are reasonable for the agent type
    4. All required fields are present
    
    Return true if valid, false if invalid.
  "#
}

// Function to generate agent status summary
function generateAgentStatusSummary(agents: AgentStatusUpdate[]) -> string {
  client claude-sonnet
  prompt #"
    Generate a concise status summary for the following agents:
    
    {% for agent in agents %}
    - {{ agent.agentType }}: {{ agent.status }} ({{ agent.progress }}% on {{ agent.currentTask }})
    {% endfor %}
    
    Create a 2-3 line summary highlighting:
    1. Overall system status
    2. Any blocked agents or dependencies
    3. Estimated time to completion
  "#
}
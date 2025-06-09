# Database Schema Design

#AutoSDLC #Database #Schema #PostgreSQL

[[AutoSDLC Documentation Hub|← Back to Index]] | [[31-WebSocket-Events|← WebSocket Events]]

## Overview

The Database Schema Design document defines the data models, relationships, and storage strategies for the AutoSDLC system. The schema is designed to support high-performance agent operations, comprehensive audit trails, and scalable multi-tenant deployments.

## Database Architecture

### Technology Stack

```yaml
databases:
  primary:
    type: PostgreSQL
    version: "15.3"
    purpose: "Transactional data, system state"
    features:
      - JSONB for flexible data
      - Full-text search
      - Row-level security
      - Partitioning for large tables
      
  cache:
    type: Redis
    version: "7.0"
    purpose: "Session data, real-time state"
    features:
      - Pub/Sub for events
      - Sorted sets for queues
      - TTL for automatic cleanup
      
  search:
    type: Elasticsearch
    version: "8.10"
    purpose: "Logs, metrics, code search"
    features:
      - Time-series data
      - Full-text search
      - Aggregations
      
  timeseries:
    type: TimescaleDB
    version: "2.11"
    purpose: "Metrics, performance data"
    features:
      - Hypertables
      - Continuous aggregates
      - Data retention policies
```

### Schema Design Principles

1. **Normalization**: Properly normalized to 3NF where appropriate
2. **Performance**: Denormalized for read-heavy operations
3. **Flexibility**: JSONB columns for extensible data
4. **Audit Trail**: Comprehensive change tracking
5. **Multi-tenancy**: Row-level security for isolation

## Core Schema

### Organizations & Users

```sql
-- Organizations (multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    github_id VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    password_hash TEXT, -- NULL for OAuth users
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_id ON users(github_id) WHERE github_id IS NOT NULL;

-- Organization membership
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '[]',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
```

### Projects

```sql
-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url TEXT,
    github_repo_id VARCHAR(255),
    settings JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_projects_org_id ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_github_repo_id ON projects(github_repo_id) WHERE github_repo_id IS NOT NULL;

-- Project members
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'developer',
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
```

### Agents

```sql
-- Agent definitions
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    instance_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive',
    configuration JSONB DEFAULT '{}',
    capabilities TEXT[] DEFAULT '{}',
    version VARCHAR(50) NOT NULL,
    
    -- Claude Code specific
    working_directory TEXT,
    claude_instructions TEXT, -- CLAUDE.md content
    custom_commands JSONB DEFAULT '[]',
    
    -- Performance metrics
    performance_metrics JSONB DEFAULT '{}',
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_agents_project_id ON agents(project_id);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_instance_id ON agents(instance_id);

-- Agent status history
CREATE TABLE agent_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_status_history_agent_id ON agent_status_history(agent_id);
CREATE INDEX idx_agent_status_history_created_at ON agent_status_history(created_at);

-- Agent output tracking
CREATE TABLE agent_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    output_type VARCHAR(50) NOT NULL, -- 'status', 'log', 'metric'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_outputs_agent_id ON agent_outputs(agent_id);
CREATE INDEX idx_agent_outputs_type ON agent_outputs(output_type);
CREATE INDEX idx_agent_outputs_created_at ON agent_outputs(created_at);

-- Partition by month for large-scale deployments
-- CREATE TABLE agent_outputs_2024_01 PARTITION OF agent_outputs
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Tasks & Workflows

```sql
-- Workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    definition JSONB NOT NULL, -- Workflow DAG
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflows_project_id ON workflows(project_id);
CREATE INDEX idx_workflows_type ON workflows(type);
CREATE INDEX idx_workflows_status ON workflows(status);

-- Workflow executions
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    execution_number SERIAL,
    status VARCHAR(50) DEFAULT 'pending',
    context JSONB DEFAULT '{}',
    variables JSONB DEFAULT '{}',
    result JSONB,
    error TEXT,
    started_by UUID REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(workflow_id, execution_number)
);

CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES agents(id),
    
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    
    -- Task data
    specification JSONB NOT NULL,
    input_data JSONB DEFAULT '{}',
    output_data JSONB,
    error_details JSONB,
    
    -- GitHub integration
    github_issue_number INTEGER,
    github_pr_number INTEGER,
    
    -- TDD specific
    test_specification TEXT,
    tdd_phase VARCHAR(20), -- 'red', 'green', 'refactor'
    test_results JSONB,
    
    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_workflow_execution_id ON tasks(workflow_execution_id);
CREATE INDEX idx_tasks_assigned_agent_id ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_priority ON tasks(priority DESC);
CREATE INDEX idx_tasks_scheduled_at ON tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Task dependencies
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'finish_to_start',
    UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
```

### Communication & Messages

```sql
-- Inter-agent messages
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) UNIQUE NOT NULL,
    source_agent_id UUID REFERENCES agents(id),
    destination_agent_id UUID REFERENCES agents(id),
    destination_type VARCHAR(50), -- 'agent' or 'broadcast'
    
    message_type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 1,
    payload JSONB NOT NULL,
    
    correlation_id VARCHAR(255),
    requires_ack BOOLEAN DEFAULT FALSE,
    ack_received_at TIMESTAMP WITH TIME ZONE,
    
    ttl INTEGER, -- seconds
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_agent_messages_source ON agent_messages(source_agent_id);
CREATE INDEX idx_agent_messages_destination ON agent_messages(destination_agent_id);
CREATE INDEX idx_agent_messages_type ON agent_messages(message_type);
CREATE INDEX idx_agent_messages_correlation_id ON agent_messages(correlation_id);
CREATE INDEX idx_agent_messages_created_at ON agent_messages(created_at);

-- Message queue for failed/delayed messages
CREATE TABLE message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES agent_messages(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_queue_status ON message_queue(status);
CREATE INDEX idx_message_queue_scheduled ON message_queue(scheduled_for) WHERE status = 'pending';
```

### GitHub Integration

```sql
-- GitHub repositories
CREATE TABLE github_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    github_id VARCHAR(255) UNIQUE NOT NULL,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    default_branch VARCHAR(255) DEFAULT 'main',
    
    webhook_id VARCHAR(255),
    webhook_secret TEXT,
    
    permissions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_github_repos_project_id ON github_repositories(project_id);
CREATE INDEX idx_github_repos_full_name ON github_repositories(full_name);

-- GitHub issues
CREATE TABLE github_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES github_repositories(id) ON DELETE CASCADE,
    github_id VARCHAR(255) NOT NULL,
    number INTEGER NOT NULL,
    
    title TEXT NOT NULL,
    body TEXT,
    state VARCHAR(50) NOT NULL,
    labels JSONB DEFAULT '[]',
    assignees JSONB DEFAULT '[]',
    
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repository_id, number)
);

CREATE INDEX idx_github_issues_repo_id ON github_issues(repository_id);
CREATE INDEX idx_github_issues_state ON github_issues(state);
CREATE INDEX idx_github_issues_number ON github_issues(number);

-- GitHub pull requests
CREATE TABLE github_pull_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES github_repositories(id) ON DELETE CASCADE,
    github_id VARCHAR(255) NOT NULL,
    number INTEGER NOT NULL,
    
    title TEXT NOT NULL,
    body TEXT,
    state VARCHAR(50) NOT NULL,
    
    head_ref VARCHAR(255),
    base_ref VARCHAR(255),
    
    draft BOOLEAN DEFAULT FALSE,
    merged BOOLEAN DEFAULT FALSE,
    mergeable BOOLEAN,
    
    labels JSONB DEFAULT '[]',
    reviewers JSONB DEFAULT '[]',
    
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    merged_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repository_id, number)
);

CREATE INDEX idx_github_prs_repo_id ON github_pull_requests(repository_id);
CREATE INDEX idx_github_prs_state ON github_pull_requests(state);
CREATE INDEX idx_github_prs_number ON github_pull_requests(number);
```

### Test Results & Coverage

```sql
-- Test suites
CREATE TABLE test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id),
    
    name VARCHAR(255) NOT NULL,
    test_framework VARCHAR(50),
    
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    skipped_tests INTEGER DEFAULT 0,
    
    duration_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_test_suites_project_id ON test_suites(project_id);
CREATE INDEX idx_test_suites_task_id ON test_suites(task_id);
CREATE INDEX idx_test_suites_executed_at ON test_suites(executed_at);

-- Individual test results
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    
    test_name TEXT NOT NULL,
    test_path TEXT,
    
    status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'skipped'
    duration_ms INTEGER,
    
    error_message TEXT,
    error_stack TEXT,
    
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_test_results_suite_id ON test_results(test_suite_id);
CREATE INDEX idx_test_results_status ON test_results(status);

-- Code coverage
CREATE TABLE code_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_suite_id UUID REFERENCES test_suites(id),
    commit_sha VARCHAR(255),
    
    line_coverage DECIMAL(5,2),
    branch_coverage DECIMAL(5,2),
    function_coverage DECIMAL(5,2),
    statement_coverage DECIMAL(5,2),
    
    coverage_data JSONB, -- Detailed coverage per file
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_code_coverage_project_id ON code_coverage(project_id);
CREATE INDEX idx_code_coverage_suite_id ON code_coverage(test_suite_id);
CREATE INDEX idx_code_coverage_commit ON code_coverage(commit_sha);
```

### Audit & Security

```sql
-- Audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    
    old_values JSONB,
    new_values JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- API keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    
    permissions JSONB DEFAULT '[]',
    expires_at TIMESTAMP WITH TIME ZONE,
    
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    
    ip_address INET,
    user_agent TEXT,
    
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

## Performance Optimization

### Indexes Strategy

```sql
-- Composite indexes for common queries
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_agent_status ON tasks(assigned_agent_id, status) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_agent_messages_dest_unprocessed ON agent_messages(destination_agent_id, created_at) 
    WHERE processed_at IS NULL;

-- Partial indexes for specific conditions
CREATE INDEX idx_tasks_pending ON tasks(scheduled_at) 
    WHERE status = 'pending' AND scheduled_at IS NOT NULL;
CREATE INDEX idx_agents_active ON agents(project_id, agent_type) 
    WHERE status = 'active';

-- GIN indexes for JSONB queries
CREATE INDEX idx_agent_config_gin ON agents USING GIN (configuration);
CREATE INDEX idx_task_spec_gin ON tasks USING GIN (specification);
CREATE INDEX idx_workflow_def_gin ON workflows USING GIN (definition);
```

### Partitioning Strategy

```sql
-- Partition large tables by time
-- Agent outputs partitioned by month
CREATE TABLE agent_outputs_partitioned (
    LIKE agent_outputs INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE agent_outputs_2024_01 PARTITION OF agent_outputs_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Automated partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + interval '1 month';
    partition_name := 'agent_outputs_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF agent_outputs_partitioned FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly partition creation
SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_monthly_partition()');
```

### Materialized Views

```sql
-- Agent performance metrics
CREATE MATERIALIZED VIEW agent_performance_daily AS
SELECT 
    a.id as agent_id,
    a.agent_type,
    a.project_id,
    DATE(t.completed_at) as date,
    COUNT(t.id) as tasks_completed,
    AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at))) as avg_task_duration_seconds,
    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)::float / COUNT(t.id) as success_rate
FROM agents a
LEFT JOIN tasks t ON a.id = t.assigned_agent_id
WHERE t.completed_at IS NOT NULL
GROUP BY a.id, a.agent_type, a.project_id, DATE(t.completed_at);

CREATE INDEX idx_agent_perf_daily ON agent_performance_daily(agent_id, date);

-- Refresh schedule
SELECT cron.schedule('refresh-agent-performance', '0 1 * * *', 
    'REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_daily');

-- Project task statistics
CREATE MATERIALIZED VIEW project_task_stats AS
SELECT 
    p.id as project_id,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'failed' THEN t.id END) as failed_tasks,
    AVG(CASE WHEN t.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) 
        END) as avg_completion_time_seconds,
    MAX(t.updated_at) as last_activity
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id;

CREATE UNIQUE INDEX idx_project_task_stats ON project_task_stats(project_id);
```

## Data Retention & Archival

### Retention Policies

```sql
-- Create archive schema
CREATE SCHEMA IF NOT EXISTS archive;

-- Archive old agent outputs
CREATE OR REPLACE FUNCTION archive_old_agent_outputs()
RETURNS void AS $$
BEGIN
    -- Move data older than 90 days to archive
    INSERT INTO archive.agent_outputs
    SELECT * FROM agent_outputs
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
    
    DELETE FROM agent_outputs
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule archival
SELECT cron.schedule('archive-agent-outputs', '0 2 * * 0', 'SELECT archive_old_agent_outputs()');

-- Data retention policies
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    retention_days INTEGER NOT NULL,
    archive_enabled BOOLEAN DEFAULT TRUE,
    delete_enabled BOOLEAN DEFAULT FALSE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO data_retention_policies (table_name, retention_days, archive_enabled, delete_enabled) VALUES
    ('agent_outputs', 90, true, false),
    ('agent_messages', 30, true, true),
    ('audit_logs', 365, true, false),
    ('test_results', 180, true, false),
    ('agent_status_history', 30, false, true);
```

## Migrations

### Migration Management

```sql
-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Example migration: Add TDD support
-- migrations/001_add_tdd_support.sql
BEGIN;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS test_specification TEXT,
ADD COLUMN IF NOT EXISTS tdd_phase VARCHAR(20),
ADD COLUMN IF NOT EXISTS test_results JSONB;

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS tdd_metrics JSONB DEFAULT '{}';

INSERT INTO schema_migrations (version) VALUES ('001_add_tdd_support');

COMMIT;
```

### Rollback Procedures

```sql
-- Rollback script example
-- rollback/001_add_tdd_support.sql
BEGIN;

ALTER TABLE tasks 
DROP COLUMN IF EXISTS test_specification,
DROP COLUMN IF EXISTS tdd_phase,
DROP COLUMN IF EXISTS test_results;

ALTER TABLE agents
DROP COLUMN IF EXISTS tdd_metrics;

DELETE FROM schema_migrations WHERE version = '001_add_tdd_support';

COMMIT;
```

## Security & Access Control

### Row Level Security

```sql
-- Enable RLS on sensitive tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- Project access policy
CREATE POLICY project_access ON projects
FOR ALL
TO application_user
USING (
    EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = projects.id
        AND pm.user_id = current_setting('app.current_user_id')::UUID
    )
    OR
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = projects.organization_id
        AND om.user_id = current_setting('app.current_user_id')::UUID
        AND om.role IN ('admin', 'owner')
    )
);

-- Task access policy
CREATE POLICY task_access ON tasks
FOR ALL
TO application_user
USING (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = current_setting('app.current_user_id')::UUID
    )
);
```

### Encryption

```sql
-- Transparent Data Encryption setup
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypted columns for sensitive data
ALTER TABLE users 
ADD COLUMN mfa_secret_encrypted BYTEA;

-- Encryption functions
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(
        data,
        current_setting('app.encryption_key')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive(data BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        data,
        current_setting('app.encryption_key')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Monitoring & Maintenance

### Database Health Queries

```sql
-- Table sizes and bloat
CREATE VIEW table_sizes AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Slow queries
CREATE VIEW slow_queries AS
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    min_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries slower than 100ms
ORDER BY mean_exec_time DESC;

-- Index usage
CREATE VIEW index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

### Maintenance Tasks

```sql
-- Vacuum and analyze schedule
CREATE OR REPLACE FUNCTION maintenance_vacuum_analyze()
RETURNS void AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    LOOP
        EXECUTE format('VACUUM ANALYZE %I.%I', 
            table_record.schemaname, 
            table_record.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance
SELECT cron.schedule('vacuum-analyze', '0 3 * * 0', 'SELECT maintenance_vacuum_analyze()');

-- Update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
    ANALYZE;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('update-statistics', '0 */6 * * *', 'SELECT update_table_statistics()');
```

## Backup & Recovery

### Backup Strategy

```yaml
backup_strategy:
  full_backup:
    schedule: "0 2 * * 0"  # Weekly on Sunday
    retention: 4  # Keep 4 weeks
    
  incremental_backup:
    schedule: "0 2 * * 1-6"  # Daily except Sunday
    retention: 7  # Keep 7 days
    
  wal_archiving:
    enabled: true
    retention: "7 days"
    
  point_in_time_recovery:
    enabled: true
    target_recovery_time: "5 minutes"
```

### Backup Scripts

```bash
#!/bin/bash
# backup.sh

# Full backup
pg_dump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --username=$DB_USER \
  --dbname=$DB_NAME \
  --format=custom \
  --blobs \
  --verbose \
  --file="/backups/full_$(date +%Y%m%d_%H%M%S).dump"

# Backup specific schemas
pg_dump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --username=$DB_USER \
  --dbname=$DB_NAME \
  --schema=public \
  --schema=archive \
  --format=custom \
  --file="/backups/schema_$(date +%Y%m%d_%H%M%S).dump"
```

## Best Practices

### 1. Schema Design
- Use UUIDs for primary keys
- Include created_at/updated_at timestamps
- Use JSONB for flexible, searchable data
- Implement soft deletes where appropriate

### 2. Performance
- Create indexes for foreign keys
- Use partial indexes for filtered queries
- Partition large tables by time
- Regular VACUUM and ANALYZE

### 3. Security
- Enable Row Level Security
- Encrypt sensitive data
- Use prepared statements
- Regular security audits

### 4. Maintenance
- Monitor query performance
- Track table growth
- Regular backups
- Test recovery procedures

### 5. Development
- Use migrations for schema changes
- Document complex queries
- Version control database scripts
- Test with production-like data

## Related Documents

- [[02-Architecture|System Architecture]]
- [[30-API-Specification|API Specification]]
- [[51-Monitoring-Setup|Monitoring & Logging Setup]]
- [[52-Security-Guidelines|Security Guidelines]]

---

**Tags**: #AutoSDLC #Database #PostgreSQL #Schema #Design
**Last Updated**: 2025-06-09
**Next**: [[40-UI-Architecture|UI Architecture →]]
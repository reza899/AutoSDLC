# Deployment Guide

#AutoSDLC #Deployment #Production #Infrastructure

[[AutoSDLC Documentation Hub|← Back to Index]] | [[42-Configuration-Interface|← Configuration Interface]]

## Overview

This guide provides comprehensive instructions for deploying the AutoSDLC system to production, including infrastructure setup, agent deployment with Claude Code in headless mode, and operational considerations.

## Deployment Architecture

### System Components

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX/ALB]
    end
    
    subgraph "Application Layer"
        API[API Servers]
        WS[WebSocket Servers]
        UI[UI Servers]
    end
    
    subgraph "Agent Layer"
        CA[Customer Agents]
        PM[PM Agents]
        CD[Coder Agents]
        CR[Reviewer Agents]
        TA[Tester Agents]
    end
    
    subgraph "Infrastructure"
        MCP[MCP Server Cluster]
        MQ[RabbitMQ Cluster]
        CACHE[Redis Cluster]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL)]
        ES[(Elasticsearch)]
        S3[Object Storage]
    end
    
    LB --> API & WS & UI
    API --> MCP
    WS --> MCP
    MCP <--> CA & PM & CD & CR & TA
    MCP --> MQ
    API --> CACHE & PG
    CA & PM & CD & CR & TA --> S3
    MCP --> ES
```

### Deployment Environments

```yaml
environments:
  development:
    scale: minimal
    redundancy: none
    data: synthetic
    
  staging:
    scale: medium
    redundancy: basic
    data: anonymized_production
    
  production:
    scale: full
    redundancy: high
    data: live
    regions: [us-east-1, eu-west-1, ap-southeast-1]
```

## Infrastructure Requirements

### Hardware Requirements

#### Minimum Production Setup
```yaml
control_plane:
  nodes: 3
  cpu: 8 cores
  memory: 32GB
  storage: 500GB SSD
  
agent_nodes:
  customer_agent:
    instances: 2
    cpu: 4 cores
    memory: 16GB
    storage: 100GB SSD
    
  pm_agent:
    instances: 3
    cpu: 4 cores
    memory: 16GB
    storage: 100GB SSD
    
  coder_agent:
    instances: 5
    cpu: 8 cores
    memory: 32GB
    storage: 200GB SSD
    
  reviewer_agent:
    instances: 4
    cpu: 6 cores
    memory: 24GB
    storage: 150GB SSD
    
  tester_agent:
    instances: 3
    cpu: 4 cores
    memory: 16GB
    storage: 100GB SSD
    
data_layer:
  postgresql:
    nodes: 3 (1 primary, 2 replicas)
    cpu: 16 cores
    memory: 64GB
    storage: 2TB SSD
    
  redis:
    nodes: 3
    cpu: 8 cores
    memory: 32GB
    
  elasticsearch:
    nodes: 3
    cpu: 12 cores
    memory: 48GB
    storage: 4TB SSD
```

### Network Requirements

```yaml
bandwidth:
  internal: 10Gbps
  external: 1Gbps
  
latency:
  internal: <1ms
  external: <100ms
  
security:
  firewall: enabled
  vpc: isolated
  subnets:
    public: [web, api]
    private: [agents, data]
```

## Pre-Deployment Setup

### 1. Environment Preparation

```bash
# Create deployment directory structure
mkdir -p autosdlc-deploy/{config,scripts,agents,data,logs}

# Clone deployment configurations
git clone https://github.com/your-org/autosdlc-deploy.git
cd autosdlc-deploy

# Set environment variables
cp .env.example .env.production
# Edit .env.production with production values
```

### 2. Infrastructure Provisioning

#### Using Terraform
```hcl
# terraform/main.tf
provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"
  
  cidr_block = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

module "kubernetes" {
  source = "./modules/eks"
  
  cluster_name = "autosdlc-production"
  node_groups = {
    control = {
      instance_types = ["m5.2xlarge"]
      min_size = 3
      max_size = 5
    }
    agents = {
      instance_types = ["m5.4xlarge"]
      min_size = 10
      max_size = 50
    }
  }
}

module "databases" {
  source = "./modules/rds"
  
  engine = "postgres"
  engine_version = "15.3"
  instance_class = "db.r6g.2xlarge"
  multi_az = true
  backup_retention = 30
}
```

```bash
# Initialize and apply Terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 3. Kubernetes Setup

```bash
# Configure kubectl
aws eks update-kubeconfig --name autosdlc-production

# Create namespaces
kubectl create namespace autosdlc-prod
kubectl create namespace autosdlc-agents
kubectl create namespace autosdlc-data

# Apply RBAC configurations
kubectl apply -f k8s/rbac/

# Install cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

## Agent Deployment

### Claude Code Agent Images

```dockerfile
# docker/agent-base/Dockerfile
FROM ubuntu:22.04

# Install Claude Code
RUN apt-get update && apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI
RUN curl -sSL https://claude.ai/install-cc.sh | bash

# Create agent user
RUN useradd -m -s /bin/bash agent

# Set up agent directories
RUN mkdir -p /opt/agent/{src,logs,data,.claude/commands} && \
    chown -R agent:agent /opt/agent

# Copy base configuration
COPY config/base-claude.md /opt/agent/CLAUDE.md
COPY scripts/entrypoint.sh /entrypoint.sh

USER agent
WORKDIR /opt/agent

ENTRYPOINT ["/entrypoint.sh"]
```

```bash
# docker/agent-base/scripts/entrypoint.sh
#!/bin/bash

# Set agent-specific environment
export AGENT_TYPE=${AGENT_TYPE:-"unknown"}
export MCP_SERVER_URL=${MCP_SERVER_URL:-"http://mcp-server:8080"}
export AGENT_OUTPUT_FILE="./Agent_Output.md"

# Initialize agent directory
if [ ! -f "CLAUDE.md" ]; then
    cp /opt/agent/CLAUDE.md.template ./CLAUDE.md
    sed -i "s/{{AGENT_TYPE}}/$AGENT_TYPE/g" ./CLAUDE.md
fi

# Start Claude Code in headless mode
exec cc -p . --headless --max-tokens 100000
```

### Kubernetes Deployments

#### Customer Agent Deployment
```yaml
# k8s/agents/customer-agent.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: customer-agent
  namespace: autosdlc-agents
spec:
  serviceName: customer-agent
  replicas: 2
  selector:
    matchLabels:
      app: customer-agent
  template:
    metadata:
      labels:
        app: customer-agent
        agent-type: customer
    spec:
      containers:
      - name: claude-agent
        image: autosdlc/claude-agent:latest
        env:
        - name: AGENT_TYPE
          value: "customer"
        - name: MCP_SERVER_URL
          value: "http://mcp-server.autosdlc-prod:8080"
        - name: CLAUDE_API_KEY
          valueFrom:
            secretKeyRef:
              name: claude-secrets
              key: api-key
        resources:
          requests:
            memory: "16Gi"
            cpu: "4"
          limits:
            memory: "16Gi"
            cpu: "4"
        volumeMounts:
        - name: agent-data
          mountPath: /opt/agent
        - name: shared-status
          mountPath: /opt/agent/shared
          readOnly: true
        livenessProbe:
          exec:
            command:
            - cat
            - /opt/agent/Agent_Output.md
          initialDelaySeconds: 30
          periodSeconds: 60
        readinessProbe:
          exec:
            command:
            - test
            - -f
            - /opt/agent/.ready
          initialDelaySeconds: 10
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: agent-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
      storageClassName: fast-ssd
```

#### PM Agent Deployment
```yaml
# Similar structure with PM-specific configuration
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: pm-agent
  namespace: autosdlc-agents
spec:
  replicas: 3
  # ... (similar to customer agent with PM-specific settings)
```

### Agent Shared Storage

```yaml
# k8s/storage/shared-status.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-agent-status
  namespace: autosdlc-agents
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: efs

---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: status-synchronizer
  namespace: autosdlc-agents
spec:
  schedule: "* * * * *"  # Every minute
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: sync
            image: autosdlc/status-sync:latest
            volumeMounts:
            - name: shared-status
              mountPath: /shared
          volumes:
          - name: shared-status
            persistentVolumeClaim:
              claimName: shared-agent-status
          restartPolicy: OnFailure
```

## Core Services Deployment

### MCP Server Cluster

```yaml
# k8s/core/mcp-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
  namespace: autosdlc-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: autosdlc/mcp-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: url
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server
  namespace: autosdlc-prod
spec:
  selector:
    app: mcp-server
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
```

### Database Setup

```bash
# Initialize primary database
kubectl exec -it postgres-primary-0 -- psql -U postgres <<EOF
CREATE DATABASE autosdlc;
CREATE USER autosdlc_app WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE autosdlc TO autosdlc_app;
EOF

# Run migrations
kubectl run migrations --image=autosdlc/migrations:latest \
  --env="DATABASE_URL=postgresql://autosdlc_app:secure_password@postgres-primary:5432/autosdlc" \
  --rm -it --restart=Never

# Set up replication
kubectl exec -it postgres-primary-0 -- psql -U postgres <<EOF
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'repl_password';
EOF
```

## Deployment Process

### 1. Pre-Deployment Checklist

```bash
#!/bin/bash
# scripts/pre-deploy-check.sh

echo "=== Pre-Deployment Checklist ==="

# Check infrastructure
echo -n "Checking Kubernetes cluster... "
kubectl cluster-info &>/dev/null && echo "✓" || echo "✗"

echo -n "Checking database connectivity... "
pg_isready -h $DB_HOST -p $DB_PORT &>/dev/null && echo "✓" || echo "✗"

echo -n "Checking Redis connectivity... "
redis-cli -h $REDIS_HOST ping &>/dev/null && echo "✓" || echo "✗"

# Check images
echo -n "Checking Docker images... "
for image in mcp-server claude-agent api-server ui-server; do
  docker pull autosdlc/$image:latest &>/dev/null || exit 1
done
echo "✓"

# Check secrets
echo -n "Checking Kubernetes secrets... "
for secret in claude-secrets db-secrets redis-secrets github-secrets; do
  kubectl get secret $secret -n autosdlc-prod &>/dev/null || exit 1
done
echo "✓"

echo "=== All checks passed ==="
```

### 2. Rolling Deployment

```bash
#!/bin/bash
# scripts/deploy.sh

VERSION=${1:-latest}
NAMESPACE=${2:-autosdlc-prod}

echo "Deploying AutoSDLC version: $VERSION"

# Deploy core services
echo "Deploying core services..."
kubectl set image deployment/mcp-server mcp-server=autosdlc/mcp-server:$VERSION -n $NAMESPACE
kubectl set image deployment/api-server api-server=autosdlc/api-server:$VERSION -n $NAMESPACE
kubectl set image deployment/ui-server ui-server=autosdlc/ui-server:$VERSION -n $NAMESPACE

# Wait for rollout
kubectl rollout status deployment/mcp-server -n $NAMESPACE
kubectl rollout status deployment/api-server -n $NAMESPACE
kubectl rollout status deployment/ui-server -n $NAMESPACE

# Deploy agents
echo "Deploying agents..."
for agent in customer pm coder reviewer tester; do
  kubectl set image statefulset/${agent}-agent claude-agent=autosdlc/claude-agent:$VERSION \
    -n autosdlc-agents
  kubectl rollout status statefulset/${agent}-agent -n autosdlc-agents
done

echo "Deployment complete!"
```

### 3. Health Verification

```bash
#!/bin/bash
# scripts/verify-health.sh

echo "=== Health Verification ==="

# Check pods
echo "Checking pod status..."
kubectl get pods -n autosdlc-prod -o wide
kubectl get pods -n autosdlc-agents -o wide

# Check services
echo "Checking service endpoints..."
kubectl get endpoints -n autosdlc-prod

# Check agent status
echo "Checking agent status..."
for agent in customer pm coder reviewer tester; do
  echo -n "$agent agent: "
  kubectl exec -it ${agent}-agent-0 -n autosdlc-agents -- \
    cat /opt/agent/Agent_Output.md | grep "Status:" | head -1
done

# Run smoke tests
echo "Running smoke tests..."
npm run test:smoke -- --env=production
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# k8s/monitoring/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      
    scrape_configs:
    - job_name: 'autosdlc-agents'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - autosdlc-agents
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_agent_type]
        action: keep
        regex: .+
      - source_labels: [__meta_kubernetes_pod_label_agent_type]
        target_label: agent_type
        
    - job_name: 'autosdlc-services'
      kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
          - autosdlc-prod
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "AutoSDLC Agent Performance",
    "panels": [
      {
        "title": "Agent Status Overview",
        "targets": [
          {
            "expr": "up{job='autosdlc-agents'}",
            "legendFormat": "{{agent_type}}-{{instance}}"
          }
        ]
      },
      {
        "title": "Task Completion Rate",
        "targets": [
          {
            "expr": "rate(agent_tasks_completed_total[5m])",
            "legendFormat": "{{agent_type}}"
          }
        ]
      },
      {
        "title": "Agent Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, agent_response_time_seconds)",
            "legendFormat": "p95 {{agent_type}}"
          }
        ]
      }
    ]
  }
}
```

## Security Configuration

### TLS/SSL Setup

```bash
# Generate certificates using cert-manager
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: autosdlc-tls
  namespace: autosdlc-prod
spec:
  secretName: autosdlc-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - autosdlc.example.com
  - api.autosdlc.example.com
  - ws.autosdlc.example.com
EOF
```

### Network Policies

```yaml
# k8s/security/network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: agent-isolation
  namespace: autosdlc-agents
spec:
  podSelector:
    matchLabels:
      role: agent
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: autosdlc-prod
    ports:
    - protocol: TCP
      port: 8081  # Agent MCP server port
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: autosdlc-prod
    ports:
    - protocol: TCP
      port: 8080  # Main MCP server
  - to:  # Allow DNS
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
```

## Backup and Recovery

### Backup Strategy

```yaml
# k8s/backup/velero-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: autosdlc-daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  template:
    hooks: {}
    includedNamespaces:
    - autosdlc-prod
    - autosdlc-agents
    - autosdlc-data
    ttl: 720h  # 30 days retention
    storageLocation: s3-backup
    volumeSnapshotLocations:
    - aws-backup
```

### Database Backup

```bash
#!/bin/bash
# scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="autosdlc_backup_${DATE}.sql"

# Perform backup
kubectl exec -it postgres-primary-0 -n autosdlc-data -- \
  pg_dump -U postgres autosdlc | gzip > $BACKUP_FILE.gz

# Upload to S3
aws s3 cp $BACKUP_FILE.gz s3://autosdlc-backups/postgres/

# Clean up local file
rm $BACKUP_FILE.gz

# Verify backup
aws s3 ls s3://autosdlc-backups/postgres/ | grep $BACKUP_FILE
```

## Scaling Configuration

### Horizontal Pod Autoscaling

```yaml
# k8s/scaling/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: coder-agent-hpa
  namespace: autosdlc-agents
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: coder-agent
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: pending_tasks
      target:
        type: AverageValue
        averageValue: "5"
```

### Vertical Pod Autoscaling

```yaml
# k8s/scaling/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: agent-vpa
  namespace: autosdlc-agents
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: coder-agent
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: claude-agent
      minAllowed:
        cpu: 2
        memory: 8Gi
      maxAllowed:
        cpu: 16
        memory: 64Gi
```

## Operational Procedures

### Rolling Updates

```bash
#!/bin/bash
# scripts/rolling-update.sh

COMPONENT=$1
VERSION=$2

echo "Starting rolling update for $COMPONENT to version $VERSION"

# Update image
kubectl set image deployment/$COMPONENT $COMPONENT=autosdlc/$COMPONENT:$VERSION \
  -n autosdlc-prod

# Monitor rollout
kubectl rollout status deployment/$COMPONENT -n autosdlc-prod

# Verify health
kubectl exec -it $COMPONENT-0 -n autosdlc-prod -- /health-check.sh
```

### Emergency Rollback

```bash
#!/bin/bash
# scripts/emergency-rollback.sh

COMPONENT=$1

echo "EMERGENCY: Rolling back $COMPONENT"

# Rollback to previous version
kubectl rollout undo deployment/$COMPONENT -n autosdlc-prod

# Wait for rollback
kubectl rollout status deployment/$COMPONENT -n autosdlc-prod

# Alert team
./scripts/send-alert.sh "Emergency rollback performed on $COMPONENT"
```

## Post-Deployment

### Validation Tests

```bash
#!/bin/bash
# scripts/post-deploy-validation.sh

echo "=== Post-Deployment Validation ==="

# Test API endpoints
echo "Testing API endpoints..."
curl -f https://api.autosdlc.example.com/health || exit 1
curl -f https://api.autosdlc.example.com/v1/agents/status || exit 1

# Test WebSocket connections
echo "Testing WebSocket connections..."
wscat -c wss://ws.autosdlc.example.com || exit 1

# Test agent functionality
echo "Testing agent functionality..."
kubectl exec -it customer-agent-0 -n autosdlc-agents -- \
  /opt/agent/.claude/commands/health-check.sh || exit 1

# Run integration tests
echo "Running integration tests..."
npm run test:integration -- --env=production

echo "=== All validations passed ==="
```

### Performance Baseline

```bash
# Establish performance baseline
npm run perf:baseline -- --env=production

# Results stored in metrics/baseline-{date}.json
```

## Maintenance

### Regular Maintenance Tasks

```yaml
# k8s/maintenance/cronjobs.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-vacuum
  namespace: autosdlc-data
spec:
  schedule: "0 3 * * 0"  # Weekly on Sunday
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: vacuum
            image: postgres:15
            command:
            - psql
            - -c
            - "VACUUM ANALYZE;"
            env:
            - name: PGHOST
              value: postgres-primary
            - name: PGDATABASE
              value: autosdlc

---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-rotation
  namespace: autosdlc-prod
spec:
  schedule: "0 0 * * *"  # Daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: rotate
            image: autosdlc/log-rotator:latest
            volumeMounts:
            - name: logs
              mountPath: /var/log/autosdlc
```

## Troubleshooting

### Common Issues

#### Agent Not Starting
```bash
# Check pod status
kubectl describe pod <agent-pod> -n autosdlc-agents

# Check Claude Code logs
kubectl logs <agent-pod> -n autosdlc-agents

# Verify CLAUDE.md exists
kubectl exec -it <agent-pod> -n autosdlc-agents -- ls -la /opt/agent/
```

#### Database Connection Issues
```bash
# Test connection from pod
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h postgres-primary -U autosdlc_app -d autosdlc

# Check network policies
kubectl get networkpolicies -n autosdlc-data
```

#### Performance Issues
```bash
# Check resource usage
kubectl top pods -n autosdlc-prod
kubectl top pods -n autosdlc-agents

# Check for throttling
kubectl describe pod <pod-name> | grep -A 5 "Events"
```

## Related Documents

- [[02-Architecture|System Architecture]]
- [[25-Claude-Code-Integration|Claude Code Integration]]
- [[51-Monitoring-Setup|Monitoring & Logging Setup]]
- [[52-Security-Guidelines|Security Guidelines]]

---

**Tags**: #AutoSDLC #Deployment #Production #Kubernetes #Infrastructure
**Last Updated**: 2025-06-09
**Next**: [[51-Monitoring-Setup|Monitoring & Logging Setup →]]
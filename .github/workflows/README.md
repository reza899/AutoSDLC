# AutoSDLC GitHub Workflows

This directory contains two Claude-related workflows:

## 1. claude.yml - Cloud-based Claude (Requires API Credits)
- **Trigger**: `@claude` in issues/PRs
- **Cost**: Uses Anthropic API credits
- **Pros**: Fully automated, no local setup needed
- **Cons**: Expensive for frequent use

## 2. claude-local.yml - Local Claude Notification (Free)
- **Trigger**: `@claude-local` in issues/PRs
- **Cost**: Free (runs on your local machine)
- **Pros**: No API costs, full control
- **Cons**: Requires manual local processing

### Testing the Local Workflow

You can verify the local workflow is working correctly:

```bash
# Run test via GitHub UI:
# Go to Actions → Claude Local Runner → Run workflow
# Enter PR number (e.g., 12) and check "Run in test mode"

# Or use GitHub CLI:
gh workflow run claude-local.yml -f issue_number=12 -f test_mode=true
```

### Usage Examples

**For free local processing:**
```
@claude-local please review this code
```

**For automated cloud processing (requires credits):**
```
@claude please implement the requested changes
```

### Helper Script

Use the included helper script for easier local processing:
```bash
./scripts/claude-github-helper.sh 12
```
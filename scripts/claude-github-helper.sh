#!/bin/bash
# Helper script to process GitHub issues/PRs with local Claude

if [ "$1" == "" ]; then
  echo "Usage: ./claude-github-helper.sh <issue-or-pr-number>"
  exit 1
fi

NUMBER=$1

# Check if it's a PR or issue
if gh pr view $NUMBER >/dev/null 2>&1; then
  echo "Processing PR #$NUMBER"
  gh pr checkout $NUMBER
  BRANCH=$(git branch --show-current)
  echo "Checked out branch: $BRANCH"
  
  # Get PR details
  gh pr view $NUMBER
  
  echo "You can now use Claude Code to make changes"
  echo "When done, push with: git push origin $BRANCH"
else
  echo "Processing Issue #$NUMBER"
  gh issue view $NUMBER
  
  echo "Create a new branch for this issue:"
  echo "git checkout -b issue-$NUMBER-fix"
fi
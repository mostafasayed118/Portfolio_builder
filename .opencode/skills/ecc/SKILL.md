---
name: ecc
description: The harness-native operator system for agentic work. Complete system: skills, instincts, memory optimization, continuous learning, security scanning, and research-first development.
license: MIT
compatibility: opencode
metadata:
  audience: advanced-developers
  workflow: agent-optimization
---

## What I do

- Provide 60 specialized subagents for delegation (planner, architect, tdd-guide, code-reviewer, security-reviewer, etc.)
- Offer 232 skills covering workflow definitions and domain knowledge
- Enable memory persistence with hooks that save/load context across sessions
- Support continuous learning - auto-extract patterns from sessions into reusable skills
- Provide verification loops with checkpoint vs continuous evals
- Enable parallelization with git worktrees and cascade method

## What's Inside

### Agents (60 specialized subagents)
- `planner.md` - Feature implementation planning
- `architect.md` - System design decisions
- `tdd-guide.md` - Test-driven development
- `code-reviewer.md` - Quality and security review
- `security-reviewer.md` - Vulnerability analysis
- `e2e-runner.md` - Playwright E2E testing
- `refactor-cleaner.md` - Dead code cleanup
- And 50+ more specialized agents

### Skills (232 workflow definitions)
- `coding-standards/` - Language best practices
- `backend-patterns/` - API, database, caching patterns
- `frontend-patterns/` - UI component patterns
- `security/` - Security scanning and hardening
- And many more domain-specific skills

### Commands (75 legacy command shims)
- `/plan` - Feature implementation planning
- `/code-review` - Quality and security review
- `/security-scan` - Vulnerability analysis
- `/tdd` - Test-driven development workflow
- And many more commands

## How to use

ECC provides a complete operator system. Key workflows:

1. **Token Optimization** - Model selection, system prompt slimming
2. **Memory Persistence** - Hooks that save/load context across sessions
3. **Continuous Learning** - Auto-extract patterns into reusable skills
4. **Verification Loops** - Checkpoint vs continuous evals
5. **Parallelization** - Git worktrees, cascade method

## Configuration

ECC uses a manifest-driven install pipeline. Configure via:
- `~/.claude/` paths for Claude Code
- `.opencode/` paths for OpenCode
- Runtime controls via environment variables

## Hook Runtime Controls

Use runtime flags to tune strictness:
- `ECC_HOOK_PROFILE=standard|minimal|strict`
- `ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"`

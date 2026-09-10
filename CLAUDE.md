# CLAUDE.md

This project follows the **Superpowers** methodology (obra/superpowers v5).

- The plugin is installed at user scope in Claude Code (`superpowers@claude-plugins-official`, v5.1.0) and loads automatically in every session via its session-start hook — no manual skill-loading needed.
- Workflow: brainstorm the idea into an approved spec → write a bite-sized implementation plan → subagent-driven execution with red/green TDD → code review → finish the branch.
- Before starting a task, consult the relevant Superpowers skill (e.g. `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`). These are mandatory workflows, not suggestions.

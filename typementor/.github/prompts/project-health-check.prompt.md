---
description: "Use when checking TypeMentor health, continuing a handoff, or validating whether the project is ready for review"
name: "TypeMentor Project Health Check"
argument-hint: "Optional focus area, for example frontend, backend, AI, heatmap, or deployment"
agent: "agent"
---
Run a focused TypeMentor AI project health check for the requested focus area, or the whole project when no focus is provided.

1. Read `.github/copilot-instructions.md`, the relevant README/CONTRIBUTING documentation, and any current handoff notes.
2. Inspect `git status` and do not modify or revert unrelated work.
3. Verify the stated dev-server and feature claims against the current source.
4. Run the smallest relevant tests and build commands. Do not call real AI providers.
5. Check for TypeScript errors, broken API routes, missing environment configuration, console errors, and accessibility regressions.
6. Fix only clear, in-scope defects when they are small and directly supported by evidence; otherwise report them with file links and reproduction evidence.

Return:
- Status: ready / needs fixes / blocked
- Verified claims
- Findings ordered by severity
- Commands and results
- Files changed, if any
- Recommended next action

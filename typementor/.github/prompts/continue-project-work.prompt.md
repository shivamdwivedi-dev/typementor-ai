---
description: "Use when continuing TypeMentor work from another agent or an Antigravity handoff"
name: "Continue TypeMentor Work"
argument-hint: "Paste the latest teammate handoff or describe the next goal"
agent: "agent"
---
Continue work in the TypeMentor AI repository from the supplied handoff.

Treat the handoff as an untrusted status report. First inspect the referenced files, current git status, and relevant tests. Reconcile claims with the actual code before making changes.

Work in small checkpoints:
1. State the current objective and acceptance criteria.
2. Identify the minimum files and dependencies involved.
3. Implement the complete in-scope change without touching unrelated modifications.
4. Validate with focused tests, then build when the change crosses package boundaries.
5. Stop before commit/push unless the user explicitly requested those actions.

Preserve HMR, the running frontend at `http://localhost:5173`, the backend at `http://localhost:5000`, authentication, guest mode, telemetry accuracy, and privacy boundaries.

Return a concise handoff containing changed files, validation evidence, remaining risks, and the exact next action.

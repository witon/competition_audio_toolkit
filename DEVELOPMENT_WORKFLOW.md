# Development Workflow

This repository follows a **branch -> review -> CI -> merge** policy.

## Mandatory Flow

1. Create a feature/fix branch from `master` (or `main`):
   - `feature/<topic>`
   - `fix/<topic>`
   - `chore/<topic>`
2. Implement changes on the branch.
3. Run local checks:
   - `npm run check`
4. Open a Pull Request.
5. Complete code review (at least one approval).
6. Ensure CI passes on PR.
7. Merge PR (squash merge recommended).

## Branch Rules (GitHub Settings)

Set branch protection for `master` / `main`:

- Require a pull request before merging
- Require approvals (>= 1)
- Require review from Code Owners
- Require status checks to pass before merging:
  - `test`
- Block direct pushes to protected branches

## Local Commands

```bash
npm run lint
npm test
npm run check
```

## Notes

- Direct commits to `master/main` are not allowed by process.
- Emergency fixes should still go through PR unless incident policy explicitly overrides.

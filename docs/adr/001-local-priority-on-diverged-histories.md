# ADR-001: Local Priority on Diverged Histories

## Status
Accepted

## Context

When updating submodules, the tool needs to decide between local sibling repositories and remote repositories as the source of truth. This decision becomes critical when both local and remote repositories contain unique commits (diverged histories).

### Original Implementation
The initial strategy prioritized remote repositories when histories diverged, following a "safety first" approach to avoid potential data loss from remote commits.

### Problem
During testing with real development scenarios, we discovered that this approach conflicts with typical development workflows where:
- Local sibling repositories contain active development work
- Unpushed commits represent current progress that developers expect to be reflected
- Developers work on multiple related repositories simultaneously

### Example Scenario
```
Remote: A---B---C (published work)
Local:  A---B---D (unpushed active development)
```

Original logic chose C (remote), but developer expected D (local) to be used.

## Decision

**We will prioritize local sibling repositories when histories have diverged.**

### New Selection Logic
When both local and remote commits exist:

1. **Local contains all remote changes** → Use local (fast-forward case)
2. **Local is behind remote** → Use remote (need to sync up)
3. **Histories diverged (both have unique commits)** → Use local (prioritize active work)

### Rationale
- **Developer Experience**: Aligns with natural development workflow expectations
- **Work Preservation**: Ensures active development work takes precedence
- **Productivity**: Reduces surprise when submodules don't reflect current work
- **Intent-based**: Assumes local changes are intentional and desired

## Consequences

### Positive
- ✅ Better developer experience for active development scenarios
- ✅ Submodules reflect current working state of sibling repositories
- ✅ Reduced cognitive overhead - behavior matches expectations
- ✅ Supports rapid prototyping and experimentation workflows

### Negative
- ⚠️ Potential to use unstable/experimental local commits
- ⚠️ Could reference commits that aren't pushed/backed up
- ⚠️ May create inconsistencies if local work is abandoned

### Mitigation
- Use `--force-remote` flag when stable remote versions are explicitly needed
- Dry-run mode allows preview of changes before applying
- Clear logging shows which source (local/remote) was selected and why

## Implementation

### Files Modified
- `src/core/submodules/strategies.ts` - Core selection logic
- `src/core/submodules/strategies.spec.ts` - Updated test cases
- `README.md` - Updated documentation
- `IMPLEMENTATION_PROPOSAL.md` - Updated specification

### Key Changes
```typescript
// Before: When diverged, prefer remote (safer)
if (bothHaveUniqueCommits) {
  return { sha: remoteSha, source: "remote", reason: "remote has diverged from local" };
}

// After: When diverged, prefer local (active development)
if (bothHaveUniqueCommits) {
  return { sha: localSha, source: "local", reason: "local has unpushed changes" };
}
```

## Date
2024-12-19

## Authors
- Developer working on pull-with-submodules
- Claude Code assistant

## References
- Issue: False "up-to-date" in dry-run mode
- Testing: Real-world scenario with harmonyjs/.claude submodule
- Philosophy: Developer productivity over safety in development tools
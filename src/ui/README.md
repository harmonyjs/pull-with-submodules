# UI Layer Architecture

## Overview

The UI layer provides a unified interface for terminal output, logging, and interactive operations with intelligent buffering and coordination to prevent output conflicts.

## Architecture

```mermaid
graph TD
    App[Application Code<br/>uses Logger interface] --> TSM[TUIStateManager<br/>Facade]
    TSM --> BL[BufferedLogger<br/>• Buffers when UI active<br/>• Flushes when idle]
    TSM --> TC[TUICoordinator<br/>• Manages spinners/tasks<br/>• Controls buffering]
    TC -.->|controls| BL
    BL --> CLA[ClackLogAdapter<br/>Logging output]
    TC --> CUA[ClackUIAdapter<br/>Spinners/tasks]
    CLA --> CP[@clack/prompts]
    CUA --> CP

    style TSM fill:#e1f5fe
    style BL fill:#fff3e0
    style TC fill:#fff3e0
    style CLA fill:#f3e5f5
    style CUA fill:#f3e5f5
```

## Components

| Layer | Component | Purpose | Key Detail |
|-------|-----------|---------|------------|
| **Facade** | TUIStateManager | Unified API | `getInstance(context)` |
| **Core** | BufferedLogger | Smart buffering | Auto-flush on UI idle |
| **Core** | TUICoordinator | UI orchestration | TTY detection |
| **Core** | TUIContextRegistry | Instance management | WeakMap cleanup |
| **Adapters** | ClackLogAdapter | Log output | Styling support |
| **Adapters** | ClackUIAdapter | Spinners/tasks | Interactive UI |
| **Support** | types.ts | Shared interfaces | ISP compliance |
| **Support** | constants.ts | UI symbols/timeouts | Centralized config |

## Usage Patterns

### Advanced Buffering Behavior

```typescript
// Buffering during concurrent operations
await Promise.all([
  logger.withSpinner('Task 1', async () => {
    logger.info('This gets buffered'); // No output conflict
  }),
  logger.withSpinner('Task 2', async () => {
    logger.warn('This also buffered'); // Clean separation
  })
]);
// All buffered logs flush here in correct order
```

### Context-Based Instances

```typescript
// Each context gets isolated logger instance
const logger1 = createLogger(context1);
const logger2 = createLogger(context2);
// No state pollution between contexts
```

## Decision Matrix

| Need | Use | Don't Use |
|------|-----|-----------|
| Simple logging | `createLogger()` | Direct `console.log` |
| Progress indication | `withSpinner()` | Raw `@clack/prompts` |
| Multiple tasks | `withTasks()` | Sequential `await`s |
| Testing | `createMockLogger()` | Mocking `console` |
| Non-TTY support | Built-in fallback | Manual detection |

## Testing

```typescript
// Universal test pattern
const logger = createMockLogger();
await yourFunction(logger);
expect(getMockCalls(logger.info)[0].arguments[0]).toBe('Expected');
```

## ⚠️ Performance Notes

- **Unbounded buffer** - Risk with excessive logging in long operations
- **WeakMap cleanup** - Automatic GC when context is released
- **TTY check cached** - No repeated syscalls

## Troubleshooting

**Logs not appearing?** → Check if spinner/task is active (buffered)
**Garbled output?** → Ensure single TUIStateManager instance per context
**No colors in CI?** → Expected: non-TTY fallback active
**Memory growing?** → Check for infinite logging in spinner operations

## Key Design Decisions

### 1. Buffering Strategy
Logs are automatically buffered when spinners or tasks are active to prevent output corruption. The buffer is flushed when UI operations complete.

### 2. Non-Interactive Fallback
When running in non-TTY environments (CI, pipes), the system automatically falls back to simple sequential output without spinners.

### 3. Context-Based Instances
Each ExecutionContext gets its own logger instance, enabling proper isolation in concurrent operations and preventing state pollution.

### 4. Separation of Concerns
- **Logging** operations are separate from **UI** operations
- Components can depend only on what they need (ISP)
- Adapters isolate external dependencies
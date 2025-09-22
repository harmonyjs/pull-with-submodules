/**
 * @fileoverview TUI context registry for managing component instances.
 *
 * Provides a WeakMap-based registry for managing TUI component instances
 * per execution context, enabling automatic cleanup when contexts are
 * garbage collected.
 */

import type { ExecutionContext } from "#types/core";
import { BufferedLogger } from "./buffered-logger.js";
import { TUICoordinator } from "./tui-coordinator.js";
import { clackLogAdapter } from "./clack-log-adapter.js";
import type {
  LogImplementation,
  IBufferedLogger,
  UIOperations,
} from "./types.js";

/**
 * Registry entry for a specific execution context.
 */
interface TUIComponents {
  logger: IBufferedLogger;
  coordinator: UIOperations;
  facade: unknown; // Will be set externally to avoid circular dependencies
}

/**
 * Internal registry for managing component instances per execution context.
 *
 * Uses WeakMap to automatically clean up instances when execution contexts
 * are garbage collected, preventing memory leaks in long-running processes.
 */
export class TUIContextRegistry {
  private readonly instances = new WeakMap<ExecutionContext, TUIComponents>();

  /**
   * Gets or creates components for the given execution context.
   *
   * @param context Execution context to get components for
   * @param logImpl Optional log implementation override
   * @returns Component instances for the context
   */
  getComponents(
    context: ExecutionContext,
    logImpl?: LogImplementation,
  ): TUIComponents {
    let components = this.instances.get(context);

    if (!components) {
      const actualLogImpl = logImpl ?? clackLogAdapter;
      const logger = new BufferedLogger(context, actualLogImpl);
      const coordinator = new TUICoordinator(logger);

      components = {
        logger,
        coordinator,
        facade: null, // Will be set by TUIStateManager
      };
      this.instances.set(context, components);
    }

    return components;
  }

  /**
   * Sets the facade for an existing context.
   *
   * @param context Execution context
   * @param facade TUIStateManager facade instance
   */
  setFacade(context: ExecutionContext, facade: unknown): void {
    const components = this.instances.get(context);
    if (components) {
      components.facade = facade;
    }
  }

  /**
   * Clears all registered components (for testing).
   *
   * Note: WeakMap automatically cleans up when contexts are garbage collected.
   * This method exists primarily for explicit test cleanup.
   */
  static clear(): void {
    // WeakMap doesn't have a clear method, but we don't need to track
    // instances manually since they'll be garbage collected automatically
  }
}

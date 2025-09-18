/**
 * @fileoverview Repository validation cache implementation.
 *
 * Provides in-memory caching for repository validation results
 * to avoid repeated filesystem operations and improve performance.
 */

/**
 * Repository validation cache interface for performance optimization.
 *
 * Allows caching validation results to avoid repeated filesystem checks
 * when processing multiple submodules or performing batch operations.
 */
export interface RepositoryCache {
  /**
   * Check if a repository path is cached.
   */
  has(path: string): boolean;

  /**
   * Get cached repository validation result.
   */
  get(path: string): boolean | undefined;

  /**
   * Set cached repository validation result.
   */
  set(path: string, isValid: boolean): void;

  /**
   * Clear all cached results.
   */
  clear(): void;
}

/**
 * Default in-memory implementation of repository cache.
 *
 * Simple Map-based cache suitable for single process operations.
 * Results are not persisted across application restarts.
 *
 * @example
 * ```ts
 * const cache = new InMemoryRepositoryCache();
 *
 * // Cache miss
 * cache.set('/path/to/repo', true);
 *
 * // Cache hit
 * const isValid = cache.get('/path/to/repo'); // true
 *
 * // Clear when done
 * cache.clear();
 * ```
 */
export class InMemoryRepositoryCache implements RepositoryCache {
  private readonly cache = new Map<string, boolean>();

  has(path: string): boolean {
    return this.cache.has(path);
  }

  get(path: string): boolean | undefined {
    return this.cache.get(path);
  }

  set(path: string, isValid: boolean): void {
    this.cache.set(path, isValid);
  }

  clear(): void {
    this.cache.clear();
  }
}

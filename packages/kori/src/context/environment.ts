/**
 * Base environment type for Kori instances.
 *
 * Can be extended to store instance-specific data and configuration.
 * Plugins and hooks can extend this type to add their own properties.
 */
export type KoriEnvironment = {
  koriKind: 'kori-environment';
};

/**
 * Creates a new Kori environment instance.
 *
 * @packageInternal Framework infrastructure
 *
 * @returns New empty environment object
 */
export function createKoriEnvironment(): KoriEnvironment {
  return {
    koriKind: 'kori-environment',
  };
}

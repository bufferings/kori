/**
 * Initialized Kori fetch handler with request processing and cleanup capabilities.
 *
 * This type represents a fully initialized Kori application that can handle
 * HTTP requests and perform cleanup when shutting down.
 */
export type KoriInitializedFetchHandler = {
  /** Processes incoming HTTP requests and returns responses */
  fetchHandler: (request: Request) => Promise<Response>;

  /** Performs cleanup operations when the handler is closed */
  onClose: () => Promise<void>;
};

/**
 * Kori fetch handler with startup initialization.
 *
 * This type represents a Kori application before initialization, providing
 * a startup hook that returns the initialized handler.
 */
export type KoriFetchHandler = {
  /** Initializes the application and returns the ready-to-use handler */
  onStart: () => Promise<KoriInitializedFetchHandler>;
};

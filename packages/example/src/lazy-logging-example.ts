import { createKori } from '@korix/kori';

// Example demonstrating lazy log data initialization
const app = createKori({
  loggerOptions: {
    level: 'info', // Only info and above will be logged
  },
});

app.get('/example', (ctx) => {
  const startTime = Date.now();

  // Traditional approach - object is always created
  ctx.log().debug('Processing request', {
    path: ctx.req.url().pathname,
    method: ctx.req.method(),
    timestamp: Date.now(),
  });

  // New lazy approach - factory function only executed when logging is enabled
  ctx.log().debug('Processing request (lazy)', () => {
    // This expensive computation only runs if debug level is enabled
    // Note: This factory won't execute because debug level is disabled
    return {
      path: ctx.req.url().pathname,
      method: ctx.req.method(),
      headers: ctx.req.headers(), // Expensive header serialization
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
      factoryExecuted: true, // This indicates the factory was called
    };
  });

  // Info level will execute the factory
  ctx.log().info('Request completed', () => {
    // This factory WILL execute because info level is enabled
    return {
      path: ctx.req.url().pathname,
      duration: Date.now() - startTime,
      status: 'success',
      factoryExecuted: true, // This indicates the factory was called
    };
  });

  return ctx.res.json({ message: 'Hello, lazy logging!' });
});

// Example with expensive computation
app.get('/heavy', (ctx) => {
  const heavyComputation = () => {
    // Simulate expensive computation without console output
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.random();
    }
    return { computedValue: result, computationCompleted: true };
  };

  // This heavy computation will NOT run because debug level is disabled
  ctx.log().debug('Debug with heavy computation', () => ({
    ...heavyComputation(),
    timestamp: Date.now(),
  }));

  // Regular logging still works
  ctx.log().info('Heavy endpoint accessed');

  return ctx.res.json({ message: 'Heavy computation avoided!' });
});

export { app };

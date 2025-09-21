/**
 * Simple logging system initialization
 * Avoids complex dependencies during build time
 */

/**
 * Initialize basic logging 
 */
export function initializeLogging(): void {
  if (typeof window !== 'undefined') {
    return; // Client-side, do nothing
  }

  try {
    // Replace console methods with structured logging
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    // Enhanced console methods that add structure
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      originalConsole.log(`[${new Date().toISOString()}] [INFO]: ${message}`);
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.name}: ${arg.message}\n${arg.stack}`;
        }
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      }).join(' ');
      originalConsole.error(`[${new Date().toISOString()}] [ERROR]: ${message}`);
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      originalConsole.warn(`[${new Date().toISOString()}] [WARN]: ${message}`);
    };

    console.info = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      originalConsole.info(`[${new Date().toISOString()}] [INFO]: ${message}`);
    };

    // Store originals for restoration if needed
    (console as any).__original = originalConsole;

    console.log('Logging system initialized successfully', {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to initialize logging system:', error);
  }
}
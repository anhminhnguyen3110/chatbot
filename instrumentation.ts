import { registerOTel } from '@vercel/otel';

export function register() {
  // Initialize basic logging system first (only on server)
  try {
    const { initializeLogging } = require('./lib/simple-logging');
    initializeLogging();
  } catch (error) {
    console.warn('Failed to initialize logging:', error);
  }
  
  // Then register OpenTelemetry
  registerOTel({ serviceName: 'vpaura' });
}

/**
 * Winston CloudWatch Logger Integration
 * 
 * This module provides a production-ready logging solution that integrates
 * Winston with AWS CloudWatch for centralized log management.
 * 
 * Features:
 * - Dual transport: Console (development) + CloudWatch (production)
 * - Automatic AWS credential detection (IAM roles, environment variables)
 * - Structured JSON logging for CloudWatch Insights
 * - Graceful fallback to console-only logging
 * - Environment-based configuration
 * - Error handling and retry logic
 */

import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import { LogMetadata } from './index';

/**
 * CloudWatch configuration interface
 */
interface CloudWatchConfig {
  logGroupName: string;
  logStreamName: string;
  awsRegion: string;
  awsAccessKeyId?: string;
  awsSecretKey?: string;
}

/**
 * Winston Logger class with CloudWatch integration
 * 
 * This class creates a logger that:
 * 1. Always logs to console for immediate feedback
 * 2. Optionally logs to CloudWatch in production
 * 3. Handles AWS credential configuration automatically
 * 4. Provides structured logging for better searchability
 */
class WinstonLogger {
  private logger: winston.Logger;
  private cloudWatchEnabled: boolean = false;

  constructor() {
    this.logger = this.createLogger();
  }

  /**
   * Creates and configures the Winston logger with appropriate transports
   */
  private createLogger(): winston.Logger {
    const isProduction = process.env.NODE_ENV === 'production';
    const enableCloudWatchDev = process.env.ENABLE_CLOUDWATCH_DEV === 'true';
    const shouldUseCloudWatch = isProduction || enableCloudWatchDev;

    const transports: winston.transport[] = [];

    // Console transport - Always enabled for immediate feedback
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            // Clean up metadata for console display
            const cleanMeta = { ...meta };
            delete cleanMeta.timestamp; // Remove duplicate timestamp
            delete cleanMeta.level;     // Remove duplicate level
            
            const metaString = Object.keys(cleanMeta).length > 0 
              ? `\n${JSON.stringify(cleanMeta, null, 2)}` 
              : '';
            return `[${timestamp}] [${level}]: ${message}${metaString}`;
          })
        ),
        level: process.env.LOG_LEVEL || 'info'
      })
    );

    // CloudWatch transport - Production or when explicitly enabled
    if (shouldUseCloudWatch && this.hasCloudWatchConfig()) {
      try {
        const cloudWatchConfig = this.getCloudWatchConfig();
        
        transports.push(
          new WinstonCloudWatch({
            logGroupName: cloudWatchConfig.logGroupName,
            logStreamName: cloudWatchConfig.logStreamName,
            awsRegion: cloudWatchConfig.awsRegion,
            awsAccessKeyId: cloudWatchConfig.awsAccessKeyId,
            awsSecretKey: cloudWatchConfig.awsSecretKey,
            
            // Format messages for CloudWatch
            messageFormatter: ({ level, message, additionalInfo }) => {
              return `[${level.toUpperCase()}] ${message} ${additionalInfo ? JSON.stringify(additionalInfo) : ''}`;
            },
            
            // Upload configuration
            uploadRate: 2000,        // Send logs every 2 seconds
            retentionInDays: 14,     // Keep logs for 14 days
            
            // Error handling
            errorHandler: (error: Error) => {
              console.error('CloudWatch logging error:', {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
              });
              // Don't throw - continue with console logging
            },
            
            // AWS SDK configuration
            awsOptions: {
              region: cloudWatchConfig.awsRegion,
              ...(cloudWatchConfig.awsAccessKeyId && {
                accessKeyId: cloudWatchConfig.awsAccessKeyId,
                secretAccessKey: cloudWatchConfig.awsSecretKey
              })
            }
          })
        );
        
        this.cloudWatchEnabled = true;
        console.log(`✅ CloudWatch logging enabled - Group: ${cloudWatchConfig.logGroupName}`);
        
      } catch (error) {
        console.warn('⚠️  Failed to initialize CloudWatch transport:', error);
        console.log('📝 Falling back to console-only logging');
      }
    }

    // Create the logger with configured transports
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      
      // Handle uncaught exceptions and unhandled promises
      exceptionHandlers: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
      rejectionHandlers: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * Checks if all required CloudWatch configuration is available
   */
  private hasCloudWatchConfig(): boolean {
    const required = [
      process.env.AWS_REGION,
      process.env.AWS_CLOUDWATCH_LOG_GROUP,
      process.env.AWS_CLOUDWATCH_LOG_STREAM
    ];

    const hasBasicConfig = required.every(config => config && config.trim() !== '');
    
    // Check for AWS credentials (either access keys or IAM role)
    const hasCredentials = Boolean(
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
      process.env.AWS_ROLE_ARN ||
      process.env.AWS_PROFILE
    );

    return hasBasicConfig && hasCredentials;
  }

  /**
   * Extracts CloudWatch configuration from environment variables
   */
  private getCloudWatchConfig(): CloudWatchConfig {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeString = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    
    return {
      logGroupName: process.env.AWS_CLOUDWATCH_LOG_GROUP!,
      logStreamName: `${process.env.AWS_CLOUDWATCH_LOG_STREAM!}-${dateString}-${timeString}`,
      awsRegion: process.env.AWS_REGION!,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  /**
   * Log info level message
   */
  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, {
      ...metadata,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Log warning level message
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, {
      ...metadata,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Log error level message
   */
  error(message: string, metadata?: LogMetadata): void {
    this.logger.error(message, {
      ...metadata,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Log debug level message
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, {
      ...metadata,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Get the underlying Winston logger for advanced usage
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Check if CloudWatch is enabled
   */
  isCloudWatchEnabled(): boolean {
    return this.cloudWatchEnabled;
  }

  /**
   * Gracefully close the logger (flush remaining logs)
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.end(() => {
        console.log('📝 Logger closed gracefully');
        resolve();
      });
    });
  }
}

// Create and export the logger instance
export const winstonLogger = new WinstonLogger();
export { WinstonLogger };

/**
 * Export the logger type for use in other modules
 */
export type { LogMetadata };
# Logging System Documentation

This documentation covers the Winston-based logging system implemented for the AI Chatbot application.

## Overview

The logging system provides:
- **Environment-specific configurations** (development, production, test)
- **Multiple transport options** (console, file, combined)
- **Daily log rotation** with configurable retention
- **Structured logging** with metadata support
- **Performance monitoring** capabilities
- **Easy transport switching** for different environments
- **Type-safe interfaces** throughout

## Quick Start

### Basic Usage

```typescript
import { logger } from '@/lib/logging';

// Simple logging
logger.info('Application started');
logger.error('Database connection failed');
logger.warn('Deprecated API usage detected');
```

### Logging with Metadata

```typescript
import { logger, createRequestMetadata, createChatMetadata } from '@/lib/logging';

// Structured request logging
const requestMeta = createRequestMetadata('req-123', 'POST', '/api/chat', 'user-456');
logger.info('Processing chat request', requestMeta);

// Chat-specific logging
const chatMeta = createChatMetadata('message-sent', 'user-456', 'conv-789', 'gpt-4', 150);
logger.info('Chat message processed', chatMeta);
```

## Architecture

### Core Components

1. **Logger Class** (`lib/logging/logger.ts`)
   - Main logging interface
   - Supports dynamic transport switching
   - Wraps Winston with additional functionality

2. **LoggerFactory** (`lib/logging/logger.ts`)
   - Singleton pattern for logger instances
   - Manages multiple named loggers
   - Creates custom configurations

3. **TransportFactory** (`lib/logging/transports.ts`)
   - Creates different transport types
   - Handles file rotation and formatting
   - Manages log directory creation

4. **Configuration System** (`lib/logging/config.ts`)
   - Environment-specific settings
   - Transport and format configurations
   - Easy environment detection

### Environment Configurations

#### Development
- **Level**: `debug` (shows all logs)
- **Transports**: Console + File
- **Console**: Enabled with colors
- **Files**: 14-day retention, 20MB max size

#### Production
- **Level**: `info` (excludes debug logs)
- **Transports**: File only
- **Console**: Disabled for performance
- **Files**: 30-day retention, 50MB max size

#### Test
- **Level**: `error` (minimal logging)
- **Transports**: Console only
- **Files**: 7-day retention, 10MB max size

### File Organization

```
logs/
├── app-2025-09-21.log          # Main application logs
├── error-2025-09-21.log        # Error-only logs
├── current.log -> app-2025-09-21.log  # Symlink to current log
└── audit.json                  # Log rotation audit trail
```

## Advanced Usage

### Custom Logger Configuration

```typescript
import { LoggerFactory } from '@/lib/logging';

const customLogger = LoggerFactory.createLogger({
  level: 'info',
  transports: ['file'],
  fileConfig: {
    directory: 'logs/custom',
    filename: 'custom-%DATE%.log',
    maxSize: '10m',
    maxFiles: '7d',
    datePattern: 'YYYY-MM-DD'
  }
}, 'custom-service');
```

### Dynamic Transport Management

```typescript
import { logger } from '@/lib/logging';

// Add console transport at runtime
logger.addTransport('console');

// Remove console transport
logger.removeTransport('console');

// Switch to combined mode
logger.updateConfig({
  transports: ['combined'],
  enableConsole: true
});
```

### Performance Monitoring

```typescript
import { logger, PerformanceLogger } from '@/lib/logging';

const perf = new PerformanceLogger('database-query');

// ... perform operation

logger.info('Query completed', perf.getMetadata({
  query: 'SELECT * FROM users',
  resultCount: 150
}));
```

### Utility Functions

```typescript
import { 
  createRequestMetadata,
  createAuthMetadata,
  sanitizeMetadata,
  formatError 
} from '@/lib/logging';

// Request logging
const requestMeta = createRequestMetadata('req-123', 'POST', '/api/users');

// Authentication events
const authMeta = createAuthMetadata('login', 'user-123', 'Chrome/91', '192.168.1.1');

// Error formatting
try {
  // ... some operation
} catch (error) {
  const errorMeta = formatError(error as Error);
  logger.error('Operation failed', errorMeta);
}

// Sanitize sensitive data
const safeMeta = sanitizeMetadata({
  username: 'john',
  password: 'secret123',  // Will be redacted
  token: 'abc123'         // Will be redacted
});
```

## Integration Examples

### Next.js API Routes

```typescript
// pages/api/chat.ts
import { logger, createRequestMetadata } from '@/lib/logging';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = nanoid();
  const metadata = createRequestMetadata(requestId, req.method!, req.url!, req.user?.id);
  
  logger.info('API request started', metadata);
  
  try {
    // ... handle request
    logger.info('API request completed', { ...metadata, status: 200 });
  } catch (error) {
    logger.error('API request failed', { 
      ...metadata, 
      error: formatError(error as Error) 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Database Operations

```typescript
// lib/db/operations.ts
import { logger, createDatabaseMetadata, PerformanceLogger } from '@/lib/logging';

export async function createUser(userData: CreateUserData) {
  const perf = new PerformanceLogger('create-user');
  
  try {
    logger.info('Creating user', createDatabaseMetadata('INSERT', 'users', userData.id));
    
    const user = await db.insert(users).values(userData);
    
    logger.info('User created successfully', {
      ...createDatabaseMetadata('INSERT', 'users', userData.id, perf.end()),
      userId: user.id
    });
    
    return user;
  } catch (error) {
    logger.error('Failed to create user', {
      ...createDatabaseMetadata('INSERT', 'users', userData.id, perf.end()),
      error: formatError(error as Error)
    });
    throw error;
  }
}
```

## Configuration Options

### LoggerConfig Interface

```typescript
interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
  transports: ('file' | 'console' | 'combined')[];
  enableConsole?: boolean;
  fileConfig?: {
    directory: string;      // Log directory path
    filename: string;       // Log filename pattern
    maxSize: string;        // Max file size (e.g., '20m')
    maxFiles: string;       // Retention period (e.g., '14d')
    datePattern: string;    // Date pattern for rotation
  };
}
```

## Production Verification

The logging system has been tested and verified to work correctly in production mode:

✅ **File Logging**: Logs are properly written to files in production  
✅ **Log Rotation**: Daily rotation with configurable retention  
✅ **Error Separation**: Separate error log files for easier debugging  
✅ **Performance**: Console disabled in production for optimal performance  
✅ **Structured Data**: Metadata properly formatted and logged  
✅ **Transport Switching**: Dynamic transport management working  

### Production Test Results

```bash
# Production mode test
NODE_ENV=production npm run logger-test

# Verify logs were created
ls -la logs/
# app-2025-09-21.log (main logs)
# error-2025-09-21.log (error logs)
# audit.json (rotation audit)

# View production logs
cat logs/app-2025-09-21.log
# Shows properly formatted logs with timestamps and metadata
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the application has write permissions to the logs directory
2. **Disk Space**: Monitor log file sizes and retention policies
3. **Log Level**: Verify the correct log level for your environment

### Environment Variables

```bash
# Set log level (overrides config)
export LOG_LEVEL=debug

# Set custom log directory
export LOG_DIR=/custom/logs/path

# Enable/disable console in production
export ENABLE_CONSOLE_LOG=true
```

This logging system provides a robust, maintainable foundation for application monitoring and debugging across all environments.
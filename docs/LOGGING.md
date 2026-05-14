# Logging System Documentation

## Overview
This project uses **Winston** for structured, production-ready logging. Winston provides flexible log management with multiple transports, log levels, and formatting options.

## Log Levels
Winston uses npm log levels:
- `error` (0): Error messages - something went wrong
- `warn` (1): Warning messages - potential issues
- `info` (2): Informational messages - general application flow
- `http` (3): HTTP request/response logging
- `verbose` (4): Verbose information
- `debug` (5): Debug information - development only
- `silly` (6): Very detailed information

## Configuration

### Environment Variables
```bash
# Set log level (default: info)
LOG_LEVEL=debug

# For production
LOG_LEVEL=warn
```

### Log Files
Logs are stored in the `logs/` directory:
- `funding-combined.log` - All logs
- `funding-error.log` - Error logs only
- `funding-exceptions.log` - Uncaught exceptions
- `funding-rejections.log` - Unhandled promise rejections

## Usage

### Basic Usage
```typescript
import { logger } from "./logger";

// Log at different levels
logger.error("Something went wrong", { error, userId });
logger.warn("Potential issue detected", { details });
logger.info("User logged in", { userId });
logger.debug("Processing payment", { paymentData });
```

### Using Context Logger
Create a logger with specific context for better traceability:

```typescript
import { createLogger } from "./logger";

const logger = createLogger("payment-service");

logger.info("Payment initiated", { amount, currency });
// Output: 2025-01-15 10:30:45 [info] [payment-service]: Payment initiated { amount: 1000, currency: "USD" }
```

### Convenience Methods
```typescript
import { log } from "./logger";

log.error("Error message", { context });
log.warn("Warning message");
log.info("Info message");
log.debug("Debug message");
```

## Best Practices

### 1. Use Appropriate Log Levels
```typescript
// ❌ Bad
logger.info("Database connection failed");

// ✅ Good
logger.error("Database connection failed", { error, retryCount });
```

### 2. Include Contextual Metadata
```typescript
// ❌ Bad
logger.info("User action");

// ✅ Good
logger.info("User action", {
  userId: user.id,
  action: "deposit",
  amount: 1000,
  timestamp: Date.now()
});
```

### 3. Don't Log Sensitive Data
```typescript
// ❌ Bad
logger.info("Payment processed", { cardNumber, cvv });

// ✅ Good
logger.info("Payment processed", {
  cardLast4: card.last4,
  amount,
  transactionId
});
```

### 4. Use Context Loggers
```typescript
// ✅ Good - Each module has its own context
const depositLogger = createLogger("deposit-service");
const withdrawLogger = createLogger("withdrawal-service");
const callbackLogger = createLogger("callback-handler");
```

## Log Rotation

For production, consider using `winston-daily-rotate-file`:

```bash
yarn add winston-daily-rotate-file
```

Update `logger.ts`:
```typescript
import "winston-daily-rotate-file";

const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: "logs/funding-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
});

logger.add(dailyRotateFileTransport);
```

## External Logging Services

### CloudWatch Logs (AWS)
```bash
yarn add winston-cloudwatch
```

### Loggly
```bash
yarn add winston-loggly-bulk
```

### Papertrail
```bash
yarn add winston-papertrail
```

### Example Integration
```typescript
import { Loggly } from "winston-loggly-bulk";

logger.add(new Loggly({
  token: process.env.LOGGLY_TOKEN,
  subdomain: process.env.LOGGLY_SUBDOMAIN,
  tags: ["funding-api", process.env.NODE_ENV],
  json: true,
}));
```

## Monitoring & Alerts

### Log Analysis
- Use log aggregation tools (ELK Stack, Splunk, Datadog)
- Set up alerts for error rate thresholds
- Monitor log volume for anomalies

### Example Query (ELK)
```
level:error AND context:payment-service AND timestamp:[now-1h TO now]
```

## Performance Considerations

1. **Async Logging**: Winston is async by default
2. **Log Level Filtering**: Set appropriate log levels in production
3. **Buffer Writes**: Winston buffers writes for efficiency
4. **Sampling**: Consider sampling high-volume debug logs

## Testing

In test environments, you can silence logs:

```typescript
if (process.env.NODE_ENV === "test") {
  logger.transports.forEach((t) => (t.silent = true));
}
```

## Troubleshooting

### Logs Not Appearing
- Check `LOG_LEVEL` environment variable
- Ensure `logs/` directory exists
- Check file permissions

### Performance Issues
- Lower log level in production
- Implement log sampling for high-volume endpoints
- Use external logging service

### Log File Size
- Implement rotation policy
- Set up cleanup cron jobs
- Use compression for archived logs

## Migration from console.log

All `console.log` statements have been replaced with Winston:

```typescript
// Before
console.log("Message", data);
console.error("Error", error);

// After
logger.info("Message", { data });
logger.error("Error", { error });
```

## Future Enhancements

1. **Structured Logging**: Already implemented via JSON format
2. **Request ID Tracking**: Add middleware to track requests across services
3. **Performance Metrics**: Log response times and throughput
4. **Security Audit Logs**: Separate sensitive operation logs
5. **Distributed Tracing**: Integrate with OpenTelemetry


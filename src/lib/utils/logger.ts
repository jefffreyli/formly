/**
 * Centralized logging utility for the application
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL =
  process.env.NEXT_PUBLIC_LOG_LEVEL === "DEBUG"
    ? LogLevel.DEBUG
    : process.env.NEXT_PUBLIC_LOG_LEVEL === "WARN"
    ? LogLevel.WARN
    : process.env.NEXT_PUBLIC_LOG_LEVEL === "ERROR"
    ? LogLevel.ERROR
    : LogLevel.INFO;

interface LogMetadata {
  [key: string]: unknown;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const meta = metadata ? ` ${JSON.stringify(metadata)}` : "";
    return `[${timestamp}] [${level}] [${this.context}] ${message}${meta}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= LOG_LEVEL;
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage("DEBUG", message, metadata));
    }
  }

  info(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage("INFO", message, metadata));
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("WARN", message, metadata));
    }
  }

  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMeta = error instanceof Error
        ? { error: error.message, stack: error.stack, ...metadata }
        : { error, ...metadata };
      console.error(this.formatMessage("ERROR", message, errorMeta));
    }
  }

  // Specialized logging for API requests
  apiRequest(endpoint: string, method: string, payload?: unknown): void {
    this.info(`API Request: ${method} ${endpoint}`, {
      method,
      endpoint,
      payload: payload ? JSON.stringify(payload).slice(0, 500) : undefined,
    });
  }

  apiResponse(endpoint: string, status: number, duration: number): void {
    this.info(`API Response: ${endpoint}`, {
      endpoint,
      status,
      duration: `${duration}ms`,
    });
  }

  // Specialized logging for Gemini API
  geminiRequest(model: string, promptLength: number, metadata?: LogMetadata): void {
    this.info("Gemini API Request", {
      model,
      promptLength,
      ...metadata,
    });
  }

  geminiResponse(
    model: string,
    responseLength: number,
    duration: number,
    metadata?: LogMetadata
  ): void {
    this.info("Gemini API Response", {
      model,
      responseLength,
      duration: `${duration}ms`,
      ...metadata,
    });
  }

  geminiError(model: string, error: Error | unknown, metadata?: LogMetadata): void {
    this.error("Gemini API Error", error, {
      model,
      ...metadata,
    });
  }
}

/**
 * Creates a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default logger for general use
 */
export const logger = createLogger("App");

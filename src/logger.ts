import stringify from "safe-stable-stringify";

import { ContextManager } from "./context";
import { LOG_TYPES, type LogLevel, type LogSettings, type Logger } from "./types";

interface LogRecord {
  argumentsArray: unknown[];
  context: Record<string, unknown>;
  date: Date;
  logLevelId: number;
  logLevelName: LogLevel;
  loggerName: string;
}

const LOG_LEVELS: LogLevel[] = [
  "silly",
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal"
];

const LOG_LEVEL_IDS: Record<LogLevel, number> = {
  silly: 0,
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  fatal: 6
};

const LOGGER_CONTEXT_KEY = "log";
const ANSI_RESET = "\u001b[0m";
const ANSI_DIM = "\u001b[2m";
const ANSI_COLORS: Record<LogLevel, string> = {
  silly: "\u001b[90m",
  trace: "\u001b[36m",
  debug: "\u001b[34m",
  info: "\u001b[32m",
  warn: "\u001b[33m",
  error: "\u001b[31m",
  fatal: "\u001b[35m"
};

type ErrorLike = Error & Record<string, unknown>;

export function createLogger(name: string, settings: LogSettings): Logger {
  return setupLogger(name, settings);
}

export function enterLogContext(initialContext: Record<string, unknown> = {}): void {
  ContextManager.enterContext(LOGGER_CONTEXT_KEY, initialContext);
}

export function runLogContext<T>(
  callback: () => T,
  initialContext: Record<string, unknown> = {}
): T {
  return ContextManager.runContext(callback, LOGGER_CONTEXT_KEY, initialContext);
}

export function addLogContext(key: string, value: unknown): void {
  ContextManager.addContext(key, value, LOGGER_CONTEXT_KEY);
}

export function getLogContext(): Record<string, unknown> | undefined {
  return ContextManager.getContext(LOGGER_CONTEXT_KEY);
}

export function removeLogContext(key: string): void {
  ContextManager.removeContext(key, LOGGER_CONTEXT_KEY);
}

export function clearLogContext(): void {
  ContextManager.clearContext(LOGGER_CONTEXT_KEY);
}

function setupLogger(name: string, { level: minLevel, style }: LogSettings): Logger {
  const minLevelIndex = LOG_LEVELS.indexOf(minLevel);

  const generateLogFn = (logLevel: LogLevel) => {
    const levelIndex = LOG_LEVELS.indexOf(logLevel);

    if (levelIndex < minLevelIndex) {
      return (..._args: unknown[]) => undefined;
    }

    return (...args: unknown[]) => {
      writeLog({
        argumentsArray: args,
        context: getLogContext() ?? { NO_CONTEXT: true },
        date: new Date(),
        logLevelName: logLevel,
        logLevelId: LOG_LEVEL_IDS[logLevel],
        loggerName: name
      }, style);
    };
  };

  return {
    silly: generateLogFn("silly"),
    trace: generateLogFn("trace"),
    debug: generateLogFn("debug"),
    info: generateLogFn("info"),
    warn: generateLogFn("warn"),
    error: generateLogFn("error"),
    fatal: generateLogFn("fatal")
  };
}

function getErrorJson(error: ErrorLike): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  Object.getOwnPropertyNames(error).forEach((key) => {
    output[key] = error[key];
  });

  return output;
}

function normalizeLogRecord(message: LogRecord): LogRecord {
  const normalizedArguments = [...message.argumentsArray];

  for (let index = 0; index < normalizedArguments.length; index += 1) {
    if (normalizedArguments[index] instanceof Error) {
      normalizedArguments[index] = getErrorJson(normalizedArguments[index] as ErrorLike);
    }
  }

  return {
    ...message,
    argumentsArray: normalizedArguments
  };
}

function writeLog(message: LogRecord, style: LogSettings["style"]): void {
  if (style === LOG_TYPES.HIDDEN) {
    return;
  }

  const normalizedMessage = normalizeLogRecord(message);

  if (style === LOG_TYPES.JSON) {
    process.stdout.write(`${stringify(normalizedMessage)}\n`);
    return;
  }

  process.stdout.write(`${formatPrettyLog(normalizedMessage)}\n`);
}

function formatPrettyLog(message: LogRecord): string {
  const timestamp = message.date.toISOString();
  const levelLabel = message.logLevelName.toUpperCase().padEnd(5, " ");
  const level = colorize(message.logLevelName, levelLabel);
  const loggerName = `${ANSI_DIM}[${message.loggerName}]${ANSI_RESET}`;
  const args = message.argumentsArray.map(formatPrettyValue).join(" ");
  const contextKeys = Object.keys(message.context);
  const context =
    contextKeys.length === 0 ? "" : ` ${ANSI_DIM}${stringify({ context: message.context })}${ANSI_RESET}`;

  return `${ANSI_DIM}${timestamp}${ANSI_RESET} ${level} ${loggerName} ${args}${context}`.trimEnd();
}

function formatPrettyValue(value: unknown): string {
  if (value instanceof Error) {
    return stringify(getErrorJson(value as ErrorLike)) ?? String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return stringify(value) ?? String(value);
}

function colorize(level: LogLevel, value: string): string {
  return `${ANSI_COLORS[level]}${value}${ANSI_RESET}`;
}

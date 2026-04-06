export type LogLevel =
  | "silly"
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal";

export const LOG_TYPES = {
  HIDDEN: "hidden",
  JSON: "json",
  PRETTY: "pretty"
} as const;

export type LogStyle = (typeof LOG_TYPES)[keyof typeof LOG_TYPES];

export interface LogSettings {
  level: LogLevel;
  style: LogStyle;
}

export interface Logger {
  silly: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
}

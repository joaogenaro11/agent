type Level = "info" | "warn" | "error" | "debug";

function emit(level: Level, scope: string, message: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [${scope}] ${message}`;
  if (level === "error") console.error(line, meta ?? "");
  else if (level === "warn") console.warn(line, meta ?? "");
  else console.log(line, meta ?? "");
}

export function createLogger(scope: string) {
  return {
    info: (msg: string, meta?: unknown) => emit("info", scope, msg, meta),
    warn: (msg: string, meta?: unknown) => emit("warn", scope, msg, meta),
    error: (msg: string, meta?: unknown) => emit("error", scope, msg, meta),
    debug: (msg: string, meta?: unknown) => {
      if (process.env.NODE_ENV !== "production") emit("debug", scope, msg, meta);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;

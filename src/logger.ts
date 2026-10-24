type Level = "info" | "warn" | "error" | "debug";

const formatMessage = (level: Level, name: string, message: string): string => {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
  return `${ts} ${level.toUpperCase().padEnd(5)} ${name}: ${message}`;
};

const createLogger = (name: string) => {
  return {
    info: (msg: string, ...args: unknown[]) =>
      console.log(formatMessage("info", name, interpolate(msg, args))),
    warn: (msg: string, ...args: unknown[]) =>
      console.warn(formatMessage("warn", name, interpolate(msg, args))),
    error: (msg: string, ...args: unknown[]) =>
      console.error(formatMessage("error", name, interpolate(msg, args))),
    debug: (msg: string, ...args: unknown[]) =>
      console.debug(formatMessage("debug", name, interpolate(msg, args))),
  };
};

const interpolate = (msg: string, args: unknown[]): string => {
  return args.reduce<string>(
    (acc, arg) => acc.replace("%s", String(arg)).replace("%d", String(arg)),
    msg,
  );
};

export { createLogger };

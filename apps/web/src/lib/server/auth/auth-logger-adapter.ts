/**
 * Routes Better-Auth's internal logging into the app logger, redacting payloads.
 *
 * Without this the library logs through its own console sink: unstructured,
 * uncorrelated with the request, invisible to log aggregation — and on a
 * resolution failure it logs the ENTIRE user-info object, email included.
 *
 * Redaction keeps what is diagnostic and drops what is personal. Which claims
 * an IdP returned is exactly what you need to tell the failure modes apart;
 * the claim values are not.
 */

/** Better-Auth's `Logger['log']` levels, minus the unused `success`. */
type AuthLogLevel = 'error' | 'warn' | 'info' | 'debug'

type WriteFn = (payload: unknown, message: string) => void

export interface LogSink {
  error: WriteFn
  warn: WriteFn
  info: WriteFn
  debug: WriteFn
}

/**
 * Reduce each argument to a shape that is safe to persist.
 *
 * Objects become their key names, arrays become a count, and Errors keep only
 * name and message — attached properties are dropped, since library code
 * routinely decorates an error with the context that caused it.
 */
export function redactLogArgs(args: readonly unknown[]): unknown[] {
  return args.map((arg) => {
    if (arg === null || typeof arg !== 'object') return arg
    if (arg instanceof Error) return { error: arg.name, message: arg.message }
    if (Array.isArray(arg)) return { items: arg.length }
    return { keys: Object.keys(arg as Record<string, unknown>) }
  })
}

/**
 * Resolve one level to a writer that carries its own receiver.
 *
 * The binding is the load-bearing part. Pino's level methods are prototype
 * methods that read `this` (`this[msgPrefixSym]`), so handing Better-Auth a
 * detached `sink[level]` reference makes the very first line the library logs
 * throw `TypeError: undefined is not an object`. Falls back to `info` for a
 * sink that omits a level, and to a no-op if that is missing too — a logger
 * that cannot be built must not take sign-in down with it.
 */
function bindLevel(sink: LogSink, level: AuthLogLevel): WriteFn {
  const method = typeof sink[level] === 'function' ? sink[level] : sink.info
  return typeof method === 'function' ? method.bind(sink) : () => {}
}

/**
 * Build the `logger` option for `betterAuth({...})`.
 *
 * `level` defaults to `info` rather than `debug` on purpose: the library filters
 * by this before calling back, and redaction allocates. Asking for debug would
 * pay that cost on every internal trace only for pino to discard the record,
 * since production runs at info. Pass a level explicitly to widen it.
 */
export function createAuthLogger(sink: LogSink, level: AuthLogLevel = 'info') {
  const writers: Record<AuthLogLevel, WriteFn> = {
    error: bindLevel(sink, 'error'),
    warn: bindLevel(sink, 'warn'),
    info: bindLevel(sink, 'info'),
    debug: bindLevel(sink, 'debug'),
  }

  return {
    level,
    disableColors: true,
    log: (level: AuthLogLevel, message: string, ...args: unknown[]) => {
      const write = writers[level] ?? writers.info
      try {
        write({ args: redactLogArgs(args) }, message)
      } catch (writeFailure) {
        // Better-Auth calls this from inside its own error handler, so a throw
        // here does not just lose a log line: it REPLACES the error the library
        // was reporting and turns the request into a 500 whose stack points at
        // the logger instead of the cause. Console is the last resort that
        // cannot itself depend on the sink we just failed to write to.
        console.error('[auth-logger] sink threw; original message:', message, writeFailure)
      }
    },
  }
}

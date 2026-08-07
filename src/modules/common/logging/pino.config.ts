import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Options as PinoHttpOptions } from 'pino-http';
import pino from 'pino';
import { requestContextAls } from '../context/context.als';

const isProduction = process.env.NODE_ENV === 'production';
const usePrettyLogs = !isProduction && process.env.LOG_FORMAT !== 'json';

export function getLogLevel(): pino.Level {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (
    configured &&
    ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(
      configured,
    )
  ) {
    return configured as pino.Level;
  }
  return isProduction ? 'info' : 'debug';
}

function getRequestContextBindings(): Record<string, unknown> {
  const store = requestContextAls.getStore();
  if (!store) {
    return {};
  }

  const bindings: Record<string, unknown> = {};
  const requestId = store.get('requestId');
  const userId = store.get('userId');
  const orgId = store.get('orgId');

  if (requestId) bindings.requestId = requestId;
  if (userId) bindings.userId = userId;
  if (orgId) bindings.orgId = orgId;

  return bindings;
}

export function createPinoOptions(): pino.LoggerOptions {
  return {
    level: getLogLevel(),
    timestamp: pino.stdTimeFunctions.isoTime,
    messageKey: 'message',
    errorKey: 'error',
    formatters: {
      level: (label) => ({ level: label }),
    },
    base: {
      service: 'pixelsetu',
      env: process.env.NODE_ENV ?? 'development',
    },
    mixin: () => getRequestContextBindings(),
    ...(usePrettyLogs
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname,service,env',
              singleLine: true,
              messageKey: 'message',
            },
          },
        }
      : {}),
  };
}

export const rootLogger = pino(createPinoOptions());

export function createPinoHttpOptions(): PinoHttpOptions {
  return {
    logger: rootLogger,
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/favicon.ico',
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) {
        return 'error';
      }
      if (res.statusCode >= 400) {
        return 'warn';
      }
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} completed`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} failed`;
    },
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'durationMs',
    },
    serializers: {
      req: (req: IncomingMessage) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res: ServerResponse) => ({
        statusCode: res.statusCode,
      }),
    },
    genReqId: (req) => {
      const headerId = req.headers['x-request-id'];
      if (typeof headerId === 'string' && headerId.length > 0) {
        return headerId;
      }
      if (Array.isArray(headerId) && headerId[0]) {
        return headerId[0];
      }
      return req.id ?? randomUUID();
    },
  };
}

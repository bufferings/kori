import { type KoriRequest, type KoriResponse } from '../context/index.js';

import { type KoriLogData } from './logger.js';

/**
 * Serializer functions for specific log data types
 */
type LogDataSerializer<T = unknown> = (data: T) => Record<string, unknown>;

/**
 * Logger serializers configuration
 */
export type KoriLogSerializers = {
  req?: LogDataSerializer<KoriRequest>;
  res?: LogDataSerializer<KoriResponse>;
  err?: LogDataSerializer<unknown>;
  [key: string]:
    | LogDataSerializer<KoriRequest>
    | LogDataSerializer<KoriResponse>
    | LogDataSerializer<unknown>
    | undefined;
};

const defaultKoriRequestSerializer: LogDataSerializer<KoriRequest> = (req: KoriRequest) => ({
  url: req.url().toString(),
  method: req.method(),
  pathParams: req.pathParams(),
  queryParams: req.queryParams(),
  headers: req.headers(),
});

const defaultKoriResponseSerializer: LogDataSerializer<KoriResponse> = (res: KoriResponse) => ({
  status: res.getStatus(),
  headers: res.getHeadersCopy(),
});

const defaultErrorSerializer: LogDataSerializer<unknown> = (data: unknown) => {
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
    };
  }
  // If data is unknown, convert it to an Error
  const error = new Error(String(data));
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
};

export const defaultKoriLogSerializers: KoriLogSerializers = {
  req: defaultKoriRequestSerializer,
  res: defaultKoriResponseSerializer,
  err: defaultErrorSerializer,
};

export function applyKoriLogSerializers(data: KoriLogData, serializers: KoriLogSerializers): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result: Record<string, unknown> = {};
  const dataObj = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(dataObj)) {
    if (key in serializers) {
      const serializer = serializers[key];
      if (serializer) {
        result[key] = (serializer as (data: unknown) => Record<string, unknown>)(value);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

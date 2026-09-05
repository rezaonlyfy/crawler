/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { Logger } from '@nestjs/common';

/**
 * Wraps every method of the decorated class so that thrown errors are
 * logged with the class name as context before they bubble up.
 * Simplified port of the messaging-service decorator (no HTTP error
 * filter stack in this worker/CLI service).
 */
export function CatchErrorWithLogger(bubble = true) {
  return (constructor: Function) => {
    const keys = Object.getOwnPropertyNames(constructor.prototype);
    keys.forEach((propertyKey) => {
      if (
        propertyKey !== 'constructor' &&
        typeof constructor.prototype[propertyKey] === 'function'
      ) {
        const originalMethod = constructor.prototype[propertyKey];

        constructor.prototype[propertyKey] = function (...args: any[]): any {
          try {
            const result = originalMethod.apply(this, args);
            if (result instanceof Promise) {
              return result.catch((error) => {
                processError(error, propertyKey);
                if (bubble) throw error;
              });
            }
            return result;
          } catch (error) {
            processError(error, propertyKey);
            if (bubble) throw error;
          }
        };
      }
    });

    function processError(error: any, propertyKey: string) {
      Logger.error(
        `${propertyKey} failed: ${error?.message ?? error}`,
        error?.stack,
        constructor.name,
      );
    }
  };
}

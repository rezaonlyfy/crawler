import { SerializedException } from './interface/serializedException.interface';

/**
 * Base class for custom exceptions.
 *
 * @abstract
 * @class ExceptionBase
 * @extends {Error}
 */
export abstract class ExceptionBase extends Error {
  abstract code: string;

  /**
   * @param {string} message
   * @param {ObjectLiteral} [metadata={}]
   * **BE CAREFUL** not to include sensitive info in 'metadata'
   */
  constructor(
    readonly message: string,
    readonly identifier?: string,
    readonly cause?: Error,
    readonly metadata?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    /** Create .stack property on a target object */
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * By default in NodeJS Error objects are not
   * serialized properly when sending plain objects
   * to external processes. This method is a workaround.
   */
  toJSON(): SerializedException {
    return {
      message: this.message,
      code: this.code,
      identifier: this.identifier,
      cause: JSON.stringify(this.cause),
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}

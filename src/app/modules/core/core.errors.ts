import { FeatureNames } from 'src/config/feature-manager'

/**
 * A custom base error class that encapsulates the name, message, status code,
 * and logging meta string (if any) for the error.
 */
export class ApplicationError extends Error {
  /**
   * Meta object to be logged by the application logger, if any.
   */
  meta?: unknown

  constructor(message?: string, meta?: unknown) {
    super()

    Error.captureStackTrace(this, this.constructor)

    this.name = this.constructor.name

    this.message = message || 'Something went wrong. Please try again.'

    this.meta = meta
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message?: string) {
    super(message)
  }
}

export class DatabaseValidationError extends ApplicationError {
  constructor(message: string) {
    super(message)
  }
}

export class DatabaseConflictError extends ApplicationError {
  constructor(message: string) {
    super(message)
  }
}

export class DatabasePayloadSizeError extends ApplicationError {
  constructor(message: string) {
    super(message)
  }
}
export class MalformedParametersError extends ApplicationError {
  constructor(message: string, meta?: unknown) {
    super(message, meta)
  }
}

/**
 * Error thrown when feature-specific functions are called
 * despite those features not being activated.
 */
export class MissingFeatureError extends ApplicationError {
  constructor(missingFeature: FeatureNames) {
    super(
      `${missingFeature} is not activated, but a feature-specific function was called.`,
    )
  }
}

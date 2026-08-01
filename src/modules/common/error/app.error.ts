const APP_ERRORS = {
  NotFoundError: {
    code: 404,
    message: 'Resource not found',
  },
  SchemaValidationError: {
    code: 422,
    message: 'Schema validation failed',
  },
  ValidationError: {
    code: 400,
    message: 'Validation failed',
  },
  UnauthorizedError: {
    code: 401,
    message: 'Unauthorized access',
  },
  InternalServerError: {
    code: 500,
    message: 'Internal server error',
  },
  Unsupported: {
    code: 400,
    message: 'Unsupported operation',
  },
};

class AppError extends Error {
  public readonly code: number;
  public readonly errorDetails: string;

  constructor(errorType: keyof typeof APP_ERRORS, customMessage?: string) {
    const error = APP_ERRORS[errorType];
    super(error.message);
    this.code = error.code;
    this.errorDetails = customMessage || error.message;
  }
}

export { APP_ERRORS, AppError };

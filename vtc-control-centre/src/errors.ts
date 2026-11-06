// Uniform, actionable error contract: { error: { code, message, resolution, resolver, details, correlationId } }
export class AppError extends Error {
  status: number;
  code: string;
  resolution?: string;
  resolver?: string;
  details?: unknown;
  constructor(status: number, code: string, message: string,
              opts: { resolution?: string; resolver?: string; details?: unknown } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.resolution = opts.resolution;
    this.resolver = opts.resolver;
    this.details = opts.details;
  }
}

export const forbidden = (message = 'You are not authorised to perform this action.', resolver?: string) =>
  new AppError(403, 'FORBIDDEN', message, {
    resolution: 'Ask an authorised user, or request the appropriate role assignment.',
    resolver: resolver ?? 'Technical Administrator (role assignment) with business-owner authorisation',
  });
export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} was not found or is outside your authorised scope.`);
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'VALIDATION_FAILED', message, { details });
export const conflict = (code: string, message: string, opts: { resolution?: string; resolver?: string; details?: unknown } = {}) =>
  new AppError(409, code, message, opts);

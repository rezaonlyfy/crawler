export interface SerializedException {
  message: string;
  code: string;
  identifier?: string;
  stack?: string;
  cause?: string;
  metadata?: unknown;
}

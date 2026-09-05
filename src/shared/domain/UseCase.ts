export interface UseCase<Response> {
  execute(...args: unknown[]): Promise<Response> | Response;
}

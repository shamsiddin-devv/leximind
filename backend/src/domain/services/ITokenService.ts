export interface ITokenService {
  generate(): string;
  digest(token: string): string;
}
export const TOKEN_SERVICE = Symbol('TokenService');

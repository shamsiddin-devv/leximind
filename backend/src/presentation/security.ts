import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  SetMetadata,
  createParamDecorator,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, type Response } from 'express';
import {
  AUTH_REPOSITORY,
  type IAuthRepository,
  type Identity,
} from '../domain/repositories/IAuthRepository';
import {
  TOKEN_SERVICE,
  type ITokenService,
} from '../domain/services/ITokenService';
export const Public = () => SetMetadata('public', true);
export const Admin = () => SetMetadata('admin', true);
export type AuthRequest = Request & { identity: Identity; requestId: string };
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthRequest>().identity,
);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_REPOSITORY) private readonly sessions: IAuthRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: ITokenService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', targets))
      return true;
    const req = ctx.switchToHttp().getRequest<AuthRequest>(),
      header = req.headers.authorization;
    if (!header || !/^Bearer [A-Za-z0-9_-]{43}$/.test(header))
      throw new UnauthorizedException('Authentication required.');
    const identity = await this.sessions.resolve(
      this.tokens.digest(header.slice(7)),
    );
    if (!identity) {
      ctx
        .switchToHttp()
        .getResponse<Response>()
        .setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
      throw new UnauthorizedException('Session invalid or expired.');
    }
    req.identity = identity;
    if (
      this.reflector.getAllAndOverride<boolean>('admin', targets) &&
      identity.role !== 'admin'
    )
      throw new ForbiddenException('Administrator access required.');
    return true;
  }
}

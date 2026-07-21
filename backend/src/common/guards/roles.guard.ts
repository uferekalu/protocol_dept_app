import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ProtocolMemberRole } from '../enums';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

// Must run after JwtAuthGuard on any route that uses it (JwtAuthGuard populates
// request.user; this guard only reads it). A route with no @Roles() metadata is left
// open to any authenticated user — this guard only narrows further, it never
// authenticates on its own.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ProtocolMemberRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    return Boolean(request.user && requiredRoles.includes(request.user.role));
  }
}

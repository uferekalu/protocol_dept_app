import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
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
    const hasRequiredRole = Boolean(request.user && requiredRoles.includes(request.user.role));

    // A bare `return false` here produces Nest's generic "Forbidden resource" — no
    // help to whoever hits it. Throwing explicitly lets us name the single most likely
    // cause: the JWT's role claim is a snapshot taken at login time (see
    // AuthService.signup()/login()), so a role change (e.g. Member -> Coordinator, or
    // the mongosh ADMIN bootstrap in backend/CLAUDE.md) never takes effect for an
    // already-issued token until the holder logs out and back in.
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        "Your account doesn't have permission for this action. If your role was recently changed, log out and log back in to refresh your session.",
      );
    }

    return true;
  }
}

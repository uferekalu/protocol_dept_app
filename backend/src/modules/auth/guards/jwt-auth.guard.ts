import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Thin wrapper around Passport's 'jwt' strategy (JwtStrategy) — validates the Bearer
// token and populates request.user with its decoded JwtPayload.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

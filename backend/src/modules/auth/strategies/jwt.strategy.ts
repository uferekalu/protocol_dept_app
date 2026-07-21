import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwtSecret')!,
    });
  }

  // Whatever this returns becomes `request.user` — the token is already
  // signature/expiry-verified by Passport before this runs, so no extra lookup is
  // needed here (unlike an opaque session token, a valid JWT's payload is trustworthy
  // on its own).
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}

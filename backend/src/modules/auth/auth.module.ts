import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ProtocolMembersModule } from '../protocol-members/protocol-members.module';
import { TermiiModule } from '../../common/termii/termii.module';

@Module({
  imports: [
    ProtocolMembersModule,
    TermiiModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('jwtSecret'),
        // expiresIn's type is a `ms`-package template-literal ("1d", "15m", ...), which
        // a plain `string` from ConfigService can't structurally satisfy — the value is
        // a runtime-valid duration string (JWT_EXPIRES_IN in .env), so the cast is safe.
        signOptions: {
          expiresIn: configService.get<string>('jwtExpiresIn') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

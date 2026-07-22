import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { MinistersModule } from './modules/ministers/ministers.module';
import { EventsModule } from './modules/events/events.module';
import { ProtocolMembersModule } from './modules/protocol-members/protocol-members.module';
import { StatusLogsModule } from './modules/status-logs/status-logs.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuthModule } from './modules/auth/auth.module';
import { ReportsModule } from './modules/reports/reports.module';

// Auth (Phase 5) is staged across PRs to avoid breaking the currently-unauthenticated
// frontend mid-phase: this PR wires up login/JWT infrastructure only — no existing
// controller is guarded yet. See backend/CLAUDE.md.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodbUri'),
      }),
    }),
    MinistersModule,
    EventsModule,
    ProtocolMembersModule,
    StatusLogsModule,
    InvitationsModule,
    AssignmentsModule,
    AuthModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

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

// NOTE for Claude Code: auth is the last remaining feature module (Phase 5), per the
// phased plan in docs/PROTOCOL_APP_BRIEF.md. The folder already exists under
// src/modules/ as a placeholder.
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

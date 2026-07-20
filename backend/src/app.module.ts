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

// NOTE for Claude Code: as each remaining feature module (assignments, auth) is built
// per the phased plan in docs/PROTOCOL_APP_BRIEF.md, import and register it here. The
// folders already exist under src/modules/ as placeholders.
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

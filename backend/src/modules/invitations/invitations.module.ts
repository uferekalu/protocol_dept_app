import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import { MinistersModule } from '../ministers/ministers.module';
import { EventsModule } from '../events/events.module';
import { ProtocolMembersModule } from '../protocol-members/protocol-members.module';
import { StatusLogsModule } from '../status-logs/status-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Invitation.name, schema: InvitationSchema }]),
    MinistersModule,
    EventsModule,
    ProtocolMembersModule,
    StatusLogsModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}

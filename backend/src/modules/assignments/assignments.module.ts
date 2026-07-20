import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsController } from './assignments.controller';
import { InvitationAssignmentsController } from './invitation-assignments.controller';
import { ProtocolMemberAssignmentsController } from './protocol-member-assignments.controller';
import { AssignmentsService } from './assignments.service';
import { Assignment, AssignmentSchema } from './schemas/assignment.schema';
import { InvitationsModule } from '../invitations/invitations.module';
import { ProtocolMembersModule } from '../protocol-members/protocol-members.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Assignment.name, schema: AssignmentSchema }]),
    InvitationsModule,
    ProtocolMembersModule,
  ],
  controllers: [
    AssignmentsController,
    InvitationAssignmentsController,
    ProtocolMemberAssignmentsController,
  ],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}

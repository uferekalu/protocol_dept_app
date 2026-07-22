import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { InvitationsModule } from '../invitations/invitations.module';
import { StatusLogsModule } from '../status-logs/status-logs.module';
import { ProtocolMembersModule } from '../protocol-members/protocol-members.module';

// Phase 6 (Polish) — brief Section 4F "Reporting & History". Pure read layer over
// existing data (Invitation, StatusLog, ProtocolMember); no new collection of its own.
@Module({
  imports: [InvitationsModule, StatusLogsModule, ProtocolMembersModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvitationsService } from '../invitations/invitations.service';
import { StatusLogsService } from '../status-logs/status-logs.service';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { InvitationDocument } from '../invitations/schemas/invitation.schema';
import { InvitationStatus } from '../../common/enums';

const MS_PER_HOUR = 60 * 60 * 1000;

export interface MinisterDaysHosted {
  minister_id: string;
  full_name: string;
  total_days: number;
}

export interface MostActiveProtocolMember {
  protocol_member_id: string;
  full_name: string;
  status_update_count: number;
}

export interface ReportsStats {
  days_hosted_per_minister: MinisterDaysHosted[];
  most_active_protocol_members: MostActiveProtocolMember[];
  // Hours between "Airport Pickup In Progress" and "Checked In At Hotel", averaged
  // across every invitation that logged both — null when no invitation has both yet.
  average_pickup_to_checkin_hours: number | null;
}

// brief Section 4F "Reporting & History" — a pure read layer over data that already
// exists elsewhere (Invitation, StatusLog, ProtocolMember). No new collection of its
// own; "simple reports" computed in application code rather than a Mongo aggregation
// pipeline, which is plenty at this app's scale (a single department's event history).
@Injectable()
export class ReportsService {
  constructor(
    private invitationsService: InvitationsService,
    private statusLogsService: StatusLogsService,
    private protocolMembersService: ProtocolMembersService,
  ) {}

  // Full historical archive — every invitation ever created, minister/event populated,
  // most recent first (InvitationsService.findAll()'s existing sort). The frontend
  // links each row into that invitation's existing status-timeline page for "full logs"
  // rather than this endpoint duplicating StatusLog data itself.
  getHistory(): Promise<InvitationDocument[]> {
    return this.invitationsService.findAll();
  }

  async getStats(): Promise<ReportsStats> {
    const [invitations, logs, members] = await Promise.all([
      this.invitationsService.findAll(),
      this.statusLogsService.findAll(),
      this.protocolMembersService.findAll(),
    ]);

    return {
      days_hosted_per_minister: this.calculateDaysHostedPerMinister(invitations),
      most_active_protocol_members: this.calculateMostActiveProtocolMembers(logs, members),
      average_pickup_to_checkin_hours: this.calculateAveragePickupToCheckinHours(logs),
    };
  }

  private calculateDaysHostedPerMinister(
    invitations: InvitationDocument[],
  ): MinisterDaysHosted[] {
    const totals = new Map<string, MinisterDaysHosted>();

    for (const invitation of invitations) {
      // Populated by InvitationsService.findAll() at runtime even though the static
      // type is still the raw schema (same loose-typing convention used by
      // findCurrentlyHosting()'s callers elsewhere in this codebase).
      const minister = invitation.minister_id as unknown as {
        _id: Types.ObjectId;
        full_name: string;
      };
      const ministerId = minister._id.toString();

      const existing = totals.get(ministerId);
      if (existing) {
        existing.total_days += invitation.number_of_days;
      } else {
        totals.set(ministerId, {
          minister_id: ministerId,
          full_name: minister.full_name,
          total_days: invitation.number_of_days,
        });
      }
    }

    return Array.from(totals.values()).sort((a, b) => b.total_days - a.total_days);
  }

  private calculateMostActiveProtocolMembers(
    logs: Array<{ updated_by: Types.ObjectId }>,
    members: Array<{ _id: Types.ObjectId; full_name: string }>,
  ): MostActiveProtocolMember[] {
    const counts = new Map<string, number>();
    for (const log of logs) {
      const id = log.updated_by.toString();
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const nameById = new Map(members.map((member) => [member._id.toString(), member.full_name]));

    return Array.from(counts.entries())
      .map(([protocol_member_id, status_update_count]) => ({
        protocol_member_id,
        full_name: nameById.get(protocol_member_id) ?? 'Unknown member',
        status_update_count,
      }))
      .sort((a, b) => b.status_update_count - a.status_update_count);
  }

  private calculateAveragePickupToCheckinHours(
    logs: Array<{ invitation_id: Types.ObjectId; status: InvitationStatus; timestamp: Date }>,
  ): number | null {
    const byInvitation = new Map<string, typeof logs>();
    for (const log of logs) {
      const id = log.invitation_id.toString();
      const bucket = byInvitation.get(id);
      if (bucket) {
        bucket.push(log);
      } else {
        byInvitation.set(id, [log]);
      }
    }

    const durationsInHours: number[] = [];
    for (const invitationLogs of byInvitation.values()) {
      const pickup = invitationLogs.find(
        (log) => log.status === InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS,
      );
      const checkIn = invitationLogs.find(
        (log) => log.status === InvitationStatus.CHECKED_IN_AT_HOTEL,
      );
      if (pickup && checkIn) {
        const hours = (checkIn.timestamp.getTime() - pickup.timestamp.getTime()) / MS_PER_HOUR;
        if (hours >= 0) durationsInHours.push(hours);
      }
    }

    if (durationsInHours.length === 0) return null;
    const total = durationsInHours.reduce((sum, hours) => sum + hours, 0);
    return total / durationsInHours.length;
  }
}

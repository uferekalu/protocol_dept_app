import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ReportsService } from './reports.service';
import { InvitationsService } from '../invitations/invitations.service';
import { StatusLogsService } from '../status-logs/status-logs.service';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { InvitationStatus } from '../../common/enums';

const ministerAId = new Types.ObjectId();
const ministerBId = new Types.ObjectId();
const memberAId = new Types.ObjectId();
const memberBId = new Types.ObjectId();
const invitation1Id = new Types.ObjectId();
const invitation2Id = new Types.ObjectId();

const mockInvitations = [
  {
    _id: invitation1Id,
    minister_id: { _id: ministerAId, full_name: 'John Adebayo' },
    number_of_days: 5,
  },
  {
    _id: invitation2Id,
    minister_id: { _id: ministerAId, full_name: 'John Adebayo' },
    number_of_days: 3,
  },
  {
    _id: new Types.ObjectId(),
    minister_id: { _id: ministerBId, full_name: 'Grace Okoro' },
    number_of_days: 4,
  },
];

describe('ReportsService', () => {
  let service: ReportsService;
  let invitationsService: { findAll: jest.Mock };
  let statusLogsService: { findAll: jest.Mock };
  let protocolMembersService: { findAll: jest.Mock };

  beforeEach(async () => {
    invitationsService = { findAll: jest.fn().mockResolvedValue(mockInvitations) };
    statusLogsService = { findAll: jest.fn().mockResolvedValue([]) };
    protocolMembersService = {
      findAll: jest.fn().mockResolvedValue([
        { _id: memberAId, full_name: 'Grace Adeyemi' },
        { _id: memberBId, full_name: 'Samuel Eze' },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: InvitationsService, useValue: invitationsService },
        { provide: StatusLogsService, useValue: statusLogsService },
        { provide: ProtocolMembersService, useValue: protocolMembersService },
      ],
    }).compile();

    service = module.get(ReportsService);
  });

  describe('getHistory', () => {
    it('delegates to InvitationsService.findAll (unfiltered, populated, sorted)', async () => {
      const result = await service.getHistory();

      expect(invitationsService.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(mockInvitations);
    });
  });

  describe('getStats', () => {
    it('sums number_of_days per minister, sorted descending', async () => {
      const stats = await service.getStats();

      expect(stats.days_hosted_per_minister).toEqual([
        { minister_id: ministerAId.toString(), full_name: 'John Adebayo', total_days: 8 },
        { minister_id: ministerBId.toString(), full_name: 'Grace Okoro', total_days: 4 },
      ]);
    });

    it('counts status-log entries per protocol member, sorted descending', async () => {
      statusLogsService.findAll.mockResolvedValue([
        { invitation_id: invitation1Id, updated_by: memberAId, status: InvitationStatus.INVITED, timestamp: new Date() },
        { invitation_id: invitation1Id, updated_by: memberAId, status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS, timestamp: new Date() },
        { invitation_id: invitation1Id, updated_by: memberBId, status: InvitationStatus.EN_ROUTE_TO_HOTEL, timestamp: new Date() },
      ]);

      const stats = await service.getStats();

      expect(stats.most_active_protocol_members).toEqual([
        { protocol_member_id: memberAId.toString(), full_name: 'Grace Adeyemi', status_update_count: 2 },
        { protocol_member_id: memberBId.toString(), full_name: 'Samuel Eze', status_update_count: 1 },
      ]);
    });

    it('returns null average pickup-to-checkin time when no invitation has logged both', async () => {
      statusLogsService.findAll.mockResolvedValue([
        { invitation_id: invitation1Id, updated_by: memberAId, status: InvitationStatus.INVITED, timestamp: new Date() },
      ]);

      const stats = await service.getStats();

      expect(stats.average_pickup_to_checkin_hours).toBeNull();
    });

    it('averages pickup-to-checkin hours across invitations that logged both', async () => {
      const baseTime = new Date('2026-04-10T08:00:00.000Z').getTime();
      statusLogsService.findAll.mockResolvedValue([
        // invitation 1: 2 hours apart
        {
          invitation_id: invitation1Id,
          updated_by: memberAId,
          status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS,
          timestamp: new Date(baseTime),
        },
        {
          invitation_id: invitation1Id,
          updated_by: memberAId,
          status: InvitationStatus.CHECKED_IN_AT_HOTEL,
          timestamp: new Date(baseTime + 2 * 60 * 60 * 1000),
        },
        // invitation 2: 4 hours apart
        {
          invitation_id: invitation2Id,
          updated_by: memberAId,
          status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS,
          timestamp: new Date(baseTime),
        },
        {
          invitation_id: invitation2Id,
          updated_by: memberAId,
          status: InvitationStatus.CHECKED_IN_AT_HOTEL,
          timestamp: new Date(baseTime + 4 * 60 * 60 * 1000),
        },
      ]);

      const stats = await service.getStats();

      expect(stats.average_pickup_to_checkin_hours).toBe(3);
    });
  });
});

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InvitationsService } from './invitations.service';
import { Invitation } from './schemas/invitation.schema';
import { MinistersService } from '../ministers/ministers.service';
import { EventsService } from '../events/events.service';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { StatusLogsService } from '../status-logs/status-logs.service';
import { InvitationStatus } from '../../common/enums';

const mockMinister = { _id: 'minister-1', full_name: 'John Adebayo' };
const mockEvent = {
  _id: 'event-1',
  name: '2026 Easter Revival',
  start_date: new Date('2026-04-01'),
  end_date: new Date('2026-04-30'),
};
const mockMember = { _id: 'member-1', full_name: 'Grace Adeyemi' };

const mockInvitation = {
  _id: 'invitation-1',
  minister_id: 'minister-1',
  event_id: 'event-1',
  arrival_date: new Date('2026-04-09'),
  departure_date: new Date('2026-04-14'),
  number_of_days: 6,
  hotel_name: 'Transcorp Hilton',
  hotel_address: '1 Aguiyi Ironsi St',
  preaching_dates: [new Date('2026-04-10'), new Date('2026-04-12')],
  status: InvitationStatus.INVITED,
};

function makeQuery(result: unknown) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

describe('InvitationsService', () => {
  let service: InvitationsService;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };
  let ministersService: { findOne: jest.Mock };
  let eventsService: { findOne: jest.Mock };
  let protocolMembersService: { findOne: jest.Mock };
  let statusLogsService: { create: jest.Mock; findByInvitation: jest.Mock };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    ministersService = { findOne: jest.fn().mockResolvedValue(mockMinister) };
    eventsService = { findOne: jest.fn().mockResolvedValue(mockEvent) };
    protocolMembersService = { findOne: jest.fn().mockResolvedValue(mockMember) };
    statusLogsService = {
      create: jest.fn().mockResolvedValue({}),
      findByInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: getModelToken(Invitation.name), useValue: model },
        { provide: MinistersService, useValue: ministersService },
        { provide: EventsService, useValue: eventsService },
        { provide: ProtocolMembersService, useValue: protocolMembersService },
        { provide: StatusLogsService, useValue: statusLogsService },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  describe('create', () => {
    const dto = {
      minister_id: 'minister-1',
      event_id: 'event-1',
      arrival_date: '2026-04-09',
      departure_date: '2026-04-14',
      hotel_name: 'Transcorp Hilton',
      hotel_address: '1 Aguiyi Ironsi St',
      preaching_dates: ['2026-04-10', '2026-04-12'],
    };

    it('validates minister_id and event_id exist', async () => {
      model.create.mockResolvedValue(mockInvitation);

      await service.create(dto);

      expect(ministersService.findOne).toHaveBeenCalledWith('minister-1');
      expect(eventsService.findOne).toHaveBeenCalledWith('event-1');
    });

    it('propagates NotFoundException when minister_id does not exist', async () => {
      ministersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when event_id does not exist', async () => {
      eventsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('auto-calculates number_of_days as an inclusive day count when omitted', async () => {
      model.create.mockResolvedValue(mockInvitation);

      await service.create(dto);

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ number_of_days: 6, status: InvitationStatus.INVITED }),
      );
    });

    it('respects an explicit number_of_days override', async () => {
      model.create.mockResolvedValue(mockInvitation);

      await service.create({ ...dto, number_of_days: 10 });

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ number_of_days: 10 }),
      );
    });

    it('rejects when departure_date is before arrival_date', async () => {
      await expect(
        service.create({ ...dto, arrival_date: '2026-04-14', departure_date: '2026-04-09' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('rejects when a preaching date falls outside the stay window', async () => {
      await expect(
        service.create({ ...dto, preaching_dates: ['2026-04-20'] }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('rejects when arrival_date is before the event start_date', async () => {
      await expect(
        service.create({ ...dto, arrival_date: '2026-03-25', departure_date: '2026-04-14' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('rejects when departure_date is after the event end_date', async () => {
      await expect(
        service.create({ ...dto, arrival_date: '2026-04-09', departure_date: '2026-05-05' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('accepts a stay exactly matching the event boundaries', async () => {
      model.create.mockResolvedValue(mockInvitation);

      await service.create({ ...dto, arrival_date: '2026-04-01', departure_date: '2026-04-30' });

      expect(model.create).toHaveBeenCalled();
    });

    it('rejects with ConflictException when the minister already has an invitation for this event', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockInvitation) });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.create.mockRejectedValue({ code: 11000 });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  it('lists all invitations sorted by arrival date descending', async () => {
    model.find.mockReturnValue(makeQuery([mockInvitation]));

    const result = await service.findAll();

    expect(model.find).toHaveBeenCalledWith({});
    expect(result).toEqual([mockInvitation]);
  });

  it('filters invitations by minister_id when provided', async () => {
    model.find.mockReturnValue(makeQuery([mockInvitation]));

    await service.findAll('minister-1');

    expect(model.find).toHaveBeenCalledWith({ minister_id: 'minister-1' });
  });

  it('filters invitations by event_id when provided', async () => {
    model.find.mockReturnValue(makeQuery([mockInvitation]));

    await service.findAll(undefined, 'event-1');

    expect(model.find).toHaveBeenCalledWith({ event_id: 'event-1' });
  });

  it('filters invitations by both minister_id and event_id when both are provided', async () => {
    model.find.mockReturnValue(makeQuery([mockInvitation]));

    await service.findAll('minister-1', 'event-1');

    expect(model.find).toHaveBeenCalledWith({
      minister_id: 'minister-1',
      event_id: 'event-1',
    });
  });

  it('finds currently-hosting invitations (status not DEPARTED_TRIP_COMPLETED)', async () => {
    model.find.mockReturnValue(makeQuery([mockInvitation]));

    await service.findCurrentlyHosting();

    expect(model.find).toHaveBeenCalledWith({
      status: { $ne: InvitationStatus.DEPARTED_TRIP_COMPLETED },
    });
  });

  it('returns an invitation by id', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockInvitation) });

    const result = await service.findOne('invitation-1');

    expect(result).toEqual(mockInvitation);
  });

  describe('exportByEvent', () => {
    const populatedInvitation = {
      ...mockInvitation,
      minister_id: { full_name: 'John Adebayo', phone_number: '+2348012345678' },
    };

    it('builds a CSV of invited ministers for the event, one row per invitation', async () => {
      model.find.mockReturnValue(makeQuery([populatedInvitation]));

      const { csv, filename } = await service.exportByEvent('event-1');

      expect(eventsService.findOne).toHaveBeenCalledWith('event-1');
      expect(filename).toBe('2026-Easter-Revival-ministers.csv');
      expect(csv).toBe(
        [
          'Minister,Phone,Status,Arrival,Departure,Hotel',
          'John Adebayo,+2348012345678,INVITED,2026-04-09,2026-04-14,Transcorp Hilton',
        ].join('\n'),
      );
    });

    it('quotes CSV values that contain a comma', async () => {
      model.find.mockReturnValue(
        makeQuery([
          {
            ...populatedInvitation,
            hotel_name: 'Transcorp Hilton, Abuja',
          },
        ]),
      );

      const { csv } = await service.exportByEvent('event-1');

      expect(csv).toContain('"Transcorp Hilton, Abuja"');
    });

    it('propagates NotFoundException when the event does not exist', async () => {
      eventsService.findOne.mockRejectedValueOnce(new NotFoundException('Event event-1 not found'));

      await expect(service.exportByEvent('event-1')).rejects.toThrow(NotFoundException);
    });
  });

  it('throws NotFoundException when the invitation does not exist', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  describe('update', () => {
    beforeEach(() => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockInvitation) });
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInvitation),
      });
    });

    it('throws NotFoundException when updating a missing invitation', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('rejects when patching departure_date before the existing arrival_date', async () => {
      await expect(
        service.update('invitation-1', { departure_date: '2026-04-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects when patching preaching_dates outside the effective stay window', async () => {
      await expect(
        service.update('invitation-1', { preaching_dates: ['2026-05-01'] }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects when patching departure_date past the existing event end_date', async () => {
      await expect(
        service.update('invitation-1', { departure_date: '2026-05-05' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('re-validates the stay against the new event when event_id changes', async () => {
      eventsService.findOne.mockImplementation((id: string) =>
        id === 'event-2'
          ? Promise.resolve({
              _id: 'event-2',
              name: 'A Narrower Event',
              start_date: new Date('2026-04-10'),
              end_date: new Date('2026-04-12'),
            })
          : Promise.resolve(mockEvent),
      );

      // mockInvitation's stay (04-09 to 04-14) no longer fits inside event-2's
      // narrower window (04-10 to 04-12), even though no dates are being patched.
      await expect(
        service.update('invitation-1', { event_id: 'event-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('recomputes number_of_days when dates change without an explicit override', async () => {
      await service.update('invitation-1', {
        arrival_date: '2026-04-09',
        departure_date: '2026-04-16',
      });

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'invitation-1',
        expect.objectContaining({ number_of_days: 8 }),
        { new: true },
      );
    });

    it('does not touch number_of_days when dates are unchanged', async () => {
      await service.update('invitation-1', { hotel_name: 'New Hotel' });

      const [, updatePayload] = model.findByIdAndUpdate.mock.calls[0];
      expect(updatePayload.number_of_days).toBeUndefined();
    });

    it('re-validates minister_id when it changes', async () => {
      await service.update('invitation-1', { minister_id: 'minister-2' });

      expect(ministersService.findOne).toHaveBeenCalledWith('minister-2');
    });

    it('rejects with ConflictException when the effective minister/event pair collides with another invitation', async () => {
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockInvitation, _id: 'invitation-2' }),
      });

      await expect(
        service.update('invitation-1', { event_id: 'event-2' }),
      ).rejects.toThrow(ConflictException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

      await expect(
        service.update('invitation-1', { hotel_name: 'Another Hotel' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  it('throws NotFoundException when deleting a missing invitation', async () => {
    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockInvitation) });
    });

    it('validates updatedBy references an existing protocol member', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockInvitation,
          status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS,
        }),
      });

      await service.updateStatus(
        'invitation-1',
        { status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS },
        'member-1',
      );

      expect(protocolMembersService.findOne).toHaveBeenCalledWith('member-1');
    });

    it('propagates NotFoundException when updatedBy does not reference a real protocol member', async () => {
      protocolMembersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.updateStatus(
          'invitation-1',
          { status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS },
          'missing-member',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(statusLogsService.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid transition (e.g. INVITED straight to DEPARTED)', async () => {
      await expect(
        service.updateStatus(
          'invitation-1',
          { status: InvitationStatus.DEPARTED_TRIP_COMPLETED },
          'member-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(statusLogsService.create).not.toHaveBeenCalled();
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects any transition once already DEPARTED_TRIP_COMPLETED', async () => {
      model.findById.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockInvitation, status: InvitationStatus.DEPARTED_TRIP_COMPLETED }),
      });

      await expect(
        service.updateStatus(
          'invitation-1',
          { status: InvitationStatus.EN_ROUTE_TO_VENUE },
          'member-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the status log entry before updating the invitation status', async () => {
      const callOrder: string[] = [];
      statusLogsService.create.mockImplementation(async () => {
        callOrder.push('log');
        return {};
      });
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockImplementation(async () => {
          callOrder.push('update');
          return { ...mockInvitation, status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS };
        }),
      });

      await service.updateStatus(
        'invitation-1',
        { status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS, notes: 'On the way' },
        'member-1',
      );

      expect(callOrder).toEqual(['log', 'update']);
      expect(statusLogsService.create).toHaveBeenCalledWith({
        invitation_id: 'invitation-1',
        status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS,
        updated_by: 'member-1',
        notes: 'On the way',
      });
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'invitation-1',
        { status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS },
        { new: true },
      );
    });

    it('allows the RETURNED_TO_HOTEL -> EN_ROUTE_TO_VENUE repeating sub-cycle', async () => {
      model.findById.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockInvitation, status: InvitationStatus.RETURNED_TO_HOTEL }),
      });
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockInvitation, status: InvitationStatus.EN_ROUTE_TO_VENUE }),
      });

      const result = await service.updateStatus(
        'invitation-1',
        { status: InvitationStatus.EN_ROUTE_TO_VENUE },
        'member-1',
      );

      expect(result.status).toBe(InvitationStatus.EN_ROUTE_TO_VENUE);
    });

    it('also allows RETURNED_TO_HOTEL -> EN_ROUTE_TO_DEPARTURE_POINT (ending the sub-cycle)', async () => {
      model.findById.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockInvitation, status: InvitationStatus.RETURNED_TO_HOTEL }),
      });
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockInvitation,
          status: InvitationStatus.EN_ROUTE_TO_DEPARTURE_POINT,
        }),
      });

      const result = await service.updateStatus(
        'invitation-1',
        { status: InvitationStatus.EN_ROUTE_TO_DEPARTURE_POINT },
        'member-1',
      );

      expect(result.status).toBe(InvitationStatus.EN_ROUTE_TO_DEPARTURE_POINT);
    });
  });
});

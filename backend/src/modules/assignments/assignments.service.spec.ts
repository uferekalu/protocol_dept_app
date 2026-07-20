import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AssignmentsService } from './assignments.service';
import { Assignment } from './schemas/assignment.schema';
import { InvitationsService } from '../invitations/invitations.service';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { AssignmentStatus, AssignmentType } from '../../common/enums';

const mockInvitation = {
  _id: 'invitation-1',
  arrival_date: new Date('2026-04-09'),
  departure_date: new Date('2026-04-14'),
};
const mockMember = { _id: 'member-1', full_name: 'Grace Adeyemi' };

const mockAssignment = {
  _id: 'assignment-1',
  invitation_id: 'invitation-1',
  protocol_member_id: 'member-1',
  assignment_type: AssignmentType.AIRPORT_PICKUP,
  scheduled_time: new Date('2026-04-09T14:00:00.000Z'),
  status: AssignmentStatus.PENDING,
};

function makeQuery(result: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };
  let invitationsService: { findOne: jest.Mock };
  let protocolMembersService: { findOne: jest.Mock };

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

    invitationsService = { findOne: jest.fn().mockResolvedValue(mockInvitation) };
    protocolMembersService = { findOne: jest.fn().mockResolvedValue(mockMember) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: getModelToken(Assignment.name), useValue: model },
        { provide: InvitationsService, useValue: invitationsService },
        { provide: ProtocolMembersService, useValue: protocolMembersService },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  describe('create', () => {
    const dto = {
      invitation_id: 'invitation-1',
      protocol_member_id: 'member-1',
      assignment_type: AssignmentType.AIRPORT_PICKUP,
      scheduled_time: '2026-04-09T14:00:00.000Z',
    };

    it('validates invitation_id and protocol_member_id exist, and forces status PENDING', async () => {
      model.create.mockResolvedValue(mockAssignment);

      await service.create(dto);

      expect(invitationsService.findOne).toHaveBeenCalledWith('invitation-1');
      expect(protocolMembersService.findOne).toHaveBeenCalledWith('member-1');
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AssignmentStatus.PENDING }),
      );
    });

    it('propagates NotFoundException when invitation_id does not exist', async () => {
      invitationsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when protocol_member_id does not exist', async () => {
      protocolMembersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('rejects when scheduled_time is before the invitation arrival_date', async () => {
      await expect(
        service.create({ ...dto, scheduled_time: '2026-04-01T09:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('rejects when scheduled_time is after the invitation departure_date', async () => {
      await expect(
        service.create({ ...dto, scheduled_time: '2026-05-01T09:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('accepts a scheduled_time later in the day on the departure date itself', async () => {
      model.create.mockResolvedValue(mockAssignment);

      // departure_date is stored at midnight; a same-day afternoon drop-off must not
      // be rejected just because its clock time is later than midnight.
      await service.create({ ...dto, scheduled_time: '2026-04-14T18:00:00.000Z' });

      expect(model.create).toHaveBeenCalled();
    });

    it('rejects with ConflictException when the same type+time already exists for this invitation', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockAssignment) });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.create.mockRejectedValue({ code: 11000 });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  it('lists all assignments sorted by scheduled_time', async () => {
    model.find.mockReturnValue(makeQuery([mockAssignment]));

    const result = await service.findAll();

    expect(model.find).toHaveBeenCalledWith();
    expect(result).toEqual([mockAssignment]);
  });

  it('lists assignments for an invitation', async () => {
    model.find.mockReturnValue(makeQuery([mockAssignment]));

    await service.findByInvitation('invitation-1');

    expect(model.find).toHaveBeenCalledWith({ invitation_id: 'invitation-1' });
  });

  it('lists assignments for a protocol member after validating the member exists', async () => {
    model.find.mockReturnValue(makeQuery([mockAssignment]));

    await service.findByProtocolMember('member-1');

    expect(protocolMembersService.findOne).toHaveBeenCalledWith('member-1');
    expect(model.find).toHaveBeenCalledWith({ protocol_member_id: 'member-1' });
  });

  it('returns an assignment by id', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockAssignment) });

    const result = await service.findOne('assignment-1');

    expect(result).toEqual(mockAssignment);
  });

  it('throws NotFoundException when the assignment does not exist', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  describe('update', () => {
    beforeEach(() => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockAssignment) });
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAssignment),
      });
    });

    it('throws NotFoundException when updating a missing assignment', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('re-validates the protocol member when reassigning', async () => {
      await service.update('assignment-1', { protocol_member_id: 'member-2' });

      expect(protocolMembersService.findOne).toHaveBeenCalledWith('member-2');
    });

    it('does not re-check invitation/stay-window when only reassigning', async () => {
      await service.update('assignment-1', { protocol_member_id: 'member-2' });

      expect(invitationsService.findOne).not.toHaveBeenCalled();
    });

    it('re-validates the stay window when rescheduling', async () => {
      await expect(
        service.update('assignment-1', { scheduled_time: '2026-05-01T09:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects with ConflictException when the effective type+time collides with another assignment', async () => {
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockAssignment, _id: 'assignment-2' }),
      });

      await expect(
        service.update('assignment-1', { scheduled_time: '2026-04-10T14:00:00.000Z' }),
      ).rejects.toThrow(ConflictException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('does not re-check for duplicates when only notes change', async () => {
      await service.update('assignment-1', { notes: 'Running 10 minutes late' });

      expect(model.findOne).not.toHaveBeenCalled();
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

      await expect(
        service.update('assignment-1', { notes: 'Some note' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  it('throws NotFoundException when deleting a missing assignment', async () => {
    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockAssignment) });
    });

    it('allows PENDING -> IN_PROGRESS without setting actual_time_completed', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockAssignment, status: AssignmentStatus.IN_PROGRESS }),
      });

      await service.updateStatus('assignment-1', { status: AssignmentStatus.IN_PROGRESS });

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'assignment-1',
        { status: AssignmentStatus.IN_PROGRESS },
        { new: true },
      );
    });

    it('allows PENDING -> COMPLETED directly and stamps actual_time_completed', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockAssignment, status: AssignmentStatus.COMPLETED }),
      });

      await service.updateStatus('assignment-1', {
        status: AssignmentStatus.COMPLETED,
        notes: 'Dropped off safely',
      });

      const [, updatePayload] = model.findByIdAndUpdate.mock.calls[0];
      expect(updatePayload.status).toBe(AssignmentStatus.COMPLETED);
      expect(updatePayload.notes).toBe('Dropped off safely');
      expect(updatePayload.actual_time_completed).toBeInstanceOf(Date);
    });

    it('rejects going backward from IN_PROGRESS to PENDING', async () => {
      model.findById.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockAssignment, status: AssignmentStatus.IN_PROGRESS }),
      });

      await expect(
        service.updateStatus('assignment-1', { status: AssignmentStatus.PENDING }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects any transition once COMPLETED (terminal)', async () => {
      model.findById.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...mockAssignment, status: AssignmentStatus.COMPLETED }),
      });

      await expect(
        service.updateStatus('assignment-1', { status: AssignmentStatus.IN_PROGRESS }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StatusLogsService } from './status-logs.service';
import { StatusLog } from './schemas/status-log.schema';
import { InvitationStatus } from '../../common/enums';

const mockLog = {
  _id: 'log-1',
  invitation_id: 'invitation-1',
  status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS,
  timestamp: new Date('2026-04-09T08:00:00.000Z'),
  updated_by: 'member-1',
};

function makeQuery(result: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

describe('StatusLogsService', () => {
  let service: StatusLogsService;
  let model: { create: jest.Mock; find: jest.Mock; findById: jest.Mock };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusLogsService,
        { provide: getModelToken(StatusLog.name), useValue: model },
      ],
    }).compile();

    service = module.get<StatusLogsService>(StatusLogsService);
  });

  it('creates a status log entry', async () => {
    model.create.mockResolvedValue(mockLog);

    const input = {
      invitation_id: 'invitation-1',
      status: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS,
      updated_by: 'member-1',
    };
    const result = await service.create(input);

    expect(model.create).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockLog);
  });

  it('lists entries for an invitation, most recent first', async () => {
    model.find.mockReturnValue(makeQuery([mockLog]));

    const result = await service.findByInvitation('invitation-1');

    expect(model.find).toHaveBeenCalledWith({ invitation_id: 'invitation-1' });
    expect(result).toEqual([mockLog]);
  });

  it('returns a log entry by id', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockLog) });

    const result = await service.findOne('log-1');

    expect(result).toEqual(mockLog);
  });

  it('throws NotFoundException when the log entry does not exist', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});

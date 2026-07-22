import { ForbiddenException } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AssignmentStatus, ProtocolMemberRole } from '../../common/enums';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let service: { findOne: jest.Mock; updateStatus: jest.Mock };

  const mockAssignment = { _id: 'assignment-1', protocol_member_id: 'member-1' };

  beforeEach(() => {
    service = {
      findOne: jest.fn().mockResolvedValue(mockAssignment),
      updateStatus: jest.fn().mockResolvedValue({ ...mockAssignment, status: AssignmentStatus.IN_PROGRESS }),
    };
    controller = new AssignmentsController(service as unknown as AssignmentsService);
  });

  describe('updateStatus', () => {
    const dto = { status: AssignmentStatus.IN_PROGRESS };

    it('allows the assigned member to update their own assignment', async () => {
      const owner: JwtPayload = { sub: 'member-1', role: ProtocolMemberRole.MEMBER };
      await controller.updateStatus('assignment-1', dto, owner);
      expect(service.updateStatus).toHaveBeenCalledWith('assignment-1', dto);
    });

    it('allows an ADMIN to update an assignment that is not theirs', async () => {
      const admin: JwtPayload = { sub: 'admin-1', role: ProtocolMemberRole.ADMIN };
      await controller.updateStatus('assignment-1', dto, admin);
      expect(service.updateStatus).toHaveBeenCalledWith('assignment-1', dto);
    });

    it('allows a COORDINATOR to update an assignment that is not theirs', async () => {
      const coordinator: JwtPayload = { sub: 'coord-1', role: ProtocolMemberRole.COORDINATOR };
      await controller.updateStatus('assignment-1', dto, coordinator);
      expect(service.updateStatus).toHaveBeenCalledWith('assignment-1', dto);
    });

    it('rejects a MEMBER who is not the assigned owner', async () => {
      const stranger: JwtPayload = { sub: 'member-2', role: ProtocolMemberRole.MEMBER };
      await expect(controller.updateStatus('assignment-1', dto, stranger)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.updateStatus).not.toHaveBeenCalled();
    });
  });
});

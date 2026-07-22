import { ForbiddenException } from '@nestjs/common';
import { ProtocolMemberAssignmentsController } from './protocol-member-assignments.controller';
import { AssignmentsService } from './assignments.service';
import { ProtocolMemberRole } from '../../common/enums';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('ProtocolMemberAssignmentsController', () => {
  let controller: ProtocolMemberAssignmentsController;
  let service: { findByProtocolMember: jest.Mock };

  beforeEach(() => {
    service = { findByProtocolMember: jest.fn().mockResolvedValue([]) };
    controller = new ProtocolMemberAssignmentsController(
      service as unknown as AssignmentsService,
    );
  });

  describe('findByProtocolMember', () => {
    it('allows a member to view their own assignments', () => {
      const self: JwtPayload = { sub: 'member-1', role: ProtocolMemberRole.MEMBER };
      controller.findByProtocolMember('member-1', self);
      expect(service.findByProtocolMember).toHaveBeenCalledWith('member-1');
    });

    it('allows an ADMIN to view anyone', () => {
      const admin: JwtPayload = { sub: 'admin-1', role: ProtocolMemberRole.ADMIN };
      controller.findByProtocolMember('member-1', admin);
      expect(service.findByProtocolMember).toHaveBeenCalledWith('member-1');
    });

    it('allows a COORDINATOR to view anyone', () => {
      const coordinator: JwtPayload = { sub: 'coord-1', role: ProtocolMemberRole.COORDINATOR };
      controller.findByProtocolMember('member-1', coordinator);
      expect(service.findByProtocolMember).toHaveBeenCalledWith('member-1');
    });

    it('rejects a member trying to view someone else', () => {
      const stranger: JwtPayload = { sub: 'member-2', role: ProtocolMemberRole.MEMBER };
      expect(() => controller.findByProtocolMember('member-1', stranger)).toThrow(
        ForbiddenException,
      );
      expect(service.findByProtocolMember).not.toHaveBeenCalled();
    });
  });
});

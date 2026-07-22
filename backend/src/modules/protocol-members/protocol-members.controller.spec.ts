import { ForbiddenException } from '@nestjs/common';
import { ProtocolMembersController } from './protocol-members.controller';
import { ProtocolMembersService } from './protocol-members.service';
import { ProtocolMemberRole } from '../../common/enums';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('ProtocolMembersController', () => {
  let controller: ProtocolMembersController;
  let service: { update: jest.Mock };

  beforeEach(() => {
    service = { update: jest.fn().mockResolvedValue({ _id: 'member-1' }) };
    controller = new ProtocolMembersController(service as unknown as ProtocolMembersService);
  });

  const admin: JwtPayload = { sub: 'admin-1', role: ProtocolMemberRole.ADMIN };
  const self: JwtPayload = { sub: 'member-1', role: ProtocolMemberRole.MEMBER };
  const otherMember: JwtPayload = { sub: 'member-2', role: ProtocolMemberRole.MEMBER };
  const coordinator: JwtPayload = { sub: 'coord-1', role: ProtocolMemberRole.COORDINATOR };

  describe('update', () => {
    it('allows a member to edit their own profile', async () => {
      await controller.update('member-1', { full_name: 'New Name' }, self);
      expect(service.update).toHaveBeenCalledWith('member-1', { full_name: 'New Name' });
    });

    it('rejects a member trying to change their own role', async () => {
      await expect(
        controller.update('member-1', { role: ProtocolMemberRole.COORDINATOR }, self),
      ).rejects.toThrow(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('rejects a member editing someone else entirely', async () => {
      await expect(
        controller.update('member-1', { full_name: 'Hijacked' }, otherMember),
      ).rejects.toThrow(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('rejects a coordinator editing someone else (only ADMIN may)', async () => {
      await expect(
        controller.update('member-1', { full_name: 'Hijacked' }, coordinator),
      ).rejects.toThrow(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('allows an ADMIN to edit any member, including their role', async () => {
      await controller.update('member-1', { role: ProtocolMemberRole.COORDINATOR }, admin);
      expect(service.update).toHaveBeenCalledWith('member-1', {
        role: ProtocolMemberRole.COORDINATOR,
      });
    });

    it('allows an ADMIN to edit their own profile including their own role', async () => {
      const adminSelf: JwtPayload = { sub: 'member-1', role: ProtocolMemberRole.ADMIN };
      await controller.update('member-1', { full_name: 'Renamed' }, adminSelf);
      expect(service.update).toHaveBeenCalledWith('member-1', { full_name: 'Renamed' });
    });
  });
});

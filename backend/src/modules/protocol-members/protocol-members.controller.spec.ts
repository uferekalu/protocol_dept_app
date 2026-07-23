import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProtocolMembersController } from './protocol-members.controller';
import { ProtocolMembersService } from './protocol-members.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { ProtocolMemberRole } from '../../common/enums';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('ProtocolMembersController', () => {
  let controller: ProtocolMembersController;
  let service: { update: jest.Mock; setPhoto: jest.Mock; removePhoto: jest.Mock };
  let cloudinaryService: { uploadImage: jest.Mock };

  beforeEach(() => {
    service = {
      update: jest.fn().mockResolvedValue({ _id: 'member-1' }),
      setPhoto: jest.fn().mockResolvedValue({ _id: 'member-1', image_url: 'https://res.cloudinary.com/photo.jpg' }),
      removePhoto: jest.fn().mockResolvedValue({ _id: 'member-1' }),
    };
    cloudinaryService = {
      uploadImage: jest.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/photo.jpg' }),
    };
    controller = new ProtocolMembersController(
      service as unknown as ProtocolMembersService,
      cloudinaryService as unknown as CloudinaryService,
    );
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

  describe('uploadPhoto', () => {
    const file = {
      buffer: Buffer.from('fake-image-bytes'),
      mimetype: 'image/png',
    } as Express.Multer.File;

    it('uploads to Cloudinary and stores the secure_url for your own profile', async () => {
      await controller.uploadPhoto('member-1', file, self);
      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(file.buffer, 'protocol-members');
      expect(service.setPhoto).toHaveBeenCalledWith(
        'member-1',
        'https://res.cloudinary.com/photo.jpg',
      );
    });

    it('allows an ADMIN to upload a photo for another member', async () => {
      await controller.uploadPhoto('member-1', file, admin);
      expect(service.setPhoto).toHaveBeenCalled();
    });

    it('rejects a member uploading a photo for someone else', async () => {
      await expect(controller.uploadPhoto('member-1', file, otherMember)).rejects.toThrow(
        ForbiddenException,
      );
      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    it('rejects when no file is provided', async () => {
      await expect(
        controller.uploadPhoto('member-1', undefined as unknown as Express.Multer.File, self),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removePhoto', () => {
    it('allows a member to remove their own photo', async () => {
      await controller.removePhoto('member-1', self);
      expect(service.removePhoto).toHaveBeenCalledWith('member-1');
    });

    it('rejects a member removing someone else\'s photo', async () => {
      await expect(controller.removePhoto('member-1', otherMember)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.removePhoto).not.toHaveBeenCalled();
    });
  });
});

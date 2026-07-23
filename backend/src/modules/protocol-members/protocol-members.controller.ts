import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProtocolMembersService } from './protocol-members.service';
import { CreateProtocolMemberDto } from './dto/create-protocol-member.dto';
import { UpdateProtocolMemberDto } from './dto/update-protocol-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ProtocolMemberRole } from '../../common/enums';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

// Every route requires login. Per the brief's Section 4G (self-service sign-up
// replacing admin-created accounts):
// - GET (directory) is open to any authenticated role — everyone can see who else is
//   in the department.
// - POST (direct admin-create) stays ADMIN-only — an escape hatch, not the primary
//   path (that's POST /auth/signup now).
// - PATCH is self-or-ADMIN, with an extra field-level check: only ADMIN may change a
//   `role` (the Member -> Coordinator promotion path). This ownership/field
//   authorization is beyond what RolesGuard's route-level check alone can express, so
//   it lives here in the controller — see update() below.
// - DELETE is ADMIN-only.
@ApiTags('protocol-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('protocol-members')
export class ProtocolMembersController {
  constructor(
    private readonly protocolMembersService: ProtocolMembersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @Roles(ProtocolMemberRole.ADMIN)
  @ApiOperation({ summary: 'Create a protocol member account directly (ADMIN escape hatch — self-service sign-up at POST /auth/signup is the primary path)' })
  @ApiConflictResponse({ description: 'A protocol member with this phone number already exists' })
  create(@Body() createProtocolMemberDto: CreateProtocolMemberDto) {
    return this.protocolMembersService.create(createProtocolMemberDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all protocol members (member directory)' })
  findAll() {
    return this.protocolMembersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single protocol member' })
  findOne(@Param('id') id: string) {
    return this.protocolMembersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a protocol member — self, or an ADMIN editing anyone" })
  @ApiConflictResponse({ description: 'A protocol member with this phone number already exists' })
  @ApiForbiddenResponse({ description: 'Only an ADMIN can edit another member or change a role' })
  async update(
    @Param('id') id: string,
    @Body() updateProtocolMemberDto: UpdateProtocolMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.assertSelfOrAdmin(id, user, 'You can only edit your own profile');
    const isAdmin = user.role === ProtocolMemberRole.ADMIN;
    if (updateProtocolMemberDto.role && !isAdmin) {
      throw new ForbiddenException('Only an ADMIN can change a role');
    }

    return this.protocolMembersService.update(id, updateProtocolMemberDto);
  }

  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('Only image files are allowed'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { photo: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Upload a profile photo — self, or an ADMIN editing anyone (max 5MB image)' })
  @ApiForbiddenResponse({ description: 'Only an ADMIN can upload a photo for another member' })
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    this.assertSelfOrAdmin(id, user, 'You can only update your own photo');
    if (!file) {
      throw new BadRequestException('No photo file provided');
    }

    const uploadResult = await this.cloudinaryService.uploadImage(file.buffer, 'protocol-members');
    return this.protocolMembersService.setPhoto(id, uploadResult.secure_url);
  }

  @Delete(':id/photo')
  @ApiOperation({ summary: 'Remove a profile photo — self, or an ADMIN editing anyone' })
  @ApiForbiddenResponse({ description: 'Only an ADMIN can remove another member\'s photo' })
  async removePhoto(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.assertSelfOrAdmin(id, user, 'You can only remove your own photo');
    return this.protocolMembersService.removePhoto(id);
  }

  @Delete(':id')
  @Roles(ProtocolMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a protocol member' })
  remove(@Param('id') id: string) {
    return this.protocolMembersService.remove(id);
  }

  private assertSelfOrAdmin(id: string, user: JwtPayload, message: string): void {
    const isSelf = user.sub === id;
    const isAdmin = user.role === ProtocolMemberRole.ADMIN;
    if (!isSelf && !isAdmin) {
      throw new ForbiddenException(message);
    }
  }
}

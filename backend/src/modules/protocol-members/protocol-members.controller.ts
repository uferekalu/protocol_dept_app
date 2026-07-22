import {
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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProtocolMembersService } from './protocol-members.service';
import { CreateProtocolMemberDto } from './dto/create-protocol-member.dto';
import { UpdateProtocolMemberDto } from './dto/update-protocol-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ProtocolMemberRole } from '../../common/enums';

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
  constructor(private readonly protocolMembersService: ProtocolMembersService) {}

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
    const isSelf = user.sub === id;
    const isAdmin = user.role === ProtocolMemberRole.ADMIN;

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('You can only edit your own profile');
    }
    if (updateProtocolMemberDto.role && !isAdmin) {
      throw new ForbiddenException('Only an ADMIN can change a role');
    }

    return this.protocolMembersService.update(id, updateProtocolMemberDto);
  }

  @Delete(':id')
  @Roles(ProtocolMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a protocol member' })
  remove(@Param('id') id: string) {
    return this.protocolMembersService.remove(id);
  }
}

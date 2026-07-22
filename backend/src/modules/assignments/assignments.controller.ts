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
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ProtocolMemberRole } from '../../common/enums';

const ELEVATED_ROLES = [ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR];

// Assigning members to legs (create/reassign/delete) and browsing the full list are
// ADMIN/COORDINATOR-only — this is the Assignment Board's backing API, a coordinator
// tool per the brief. Marking one's own assignment complete is different: brief Section
// 4C is explicit that the assigned Protocol Member does this themselves, so
// updateStatus is open to the owning MEMBER too (or an ADMIN/COORDINATOR override) —
// see the ownership check below, which RolesGuard's route-level check can't express on
// its own since it needs the assignment's own protocol_member_id.
@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Assign a protocol member to a leg of an invitation' })
  @ApiConflictResponse({
    description: 'An assignment of this type already exists for this invitation at this time',
  })
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Get()
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'List all assignments' })
  findAll() {
    return this.assignmentsService.findAll();
  }

  @Get(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Get a single assignment' })
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Move an assignment to its next status (transition-guarded)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateAssignmentStatusDto: UpdateAssignmentStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const assignment = await this.assignmentsService.findOne(id);
    const isOwner = assignment.protocol_member_id.toString() === user.sub;
    if (!isOwner && !ELEVATED_ROLES.includes(user.role)) {
      throw new ForbiddenException('You can only update your own assignments');
    }
    return this.assignmentsService.updateStatus(id, updateAssignmentStatusDto);
  }

  @Patch(':id')
  @Roles(...ELEVATED_ROLES)
  @ApiOperation({ summary: 'Update assignment details (reassign, reschedule, notes)' })
  @ApiConflictResponse({
    description: 'An assignment of this type already exists for this invitation at this time',
  })
  update(@Param('id') id: string, @Body() updateAssignmentDto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, updateAssignmentDto);
  }

  @Delete(':id')
  @Roles(...ELEVATED_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assignment' })
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }
}

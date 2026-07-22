import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProtocolMemberRole } from '../../common/enums';

// Lives in AssignmentsModule (not InvitationsModule) to avoid a circular module
// dependency — AssignmentsModule already depends on InvitationsService for referential
// checks, so InvitationsModule can't depend back on AssignmentsModule. Nest doesn't
// require a route's URL prefix to match the module that "owns" the resource, so this
// still delivers GET /invitations/:id/assignments cleanly.
//
// ADMIN/COORDINATOR-only, same as AssignmentsController's list/findOne — this is the
// Assignment Board's per-invitation view, a coordinator tool. A MEMBER's equivalent is
// ProtocolMemberAssignmentsController's own-scoped "My Assignments" below.
@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR)
@Controller('invitations')
export class InvitationAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(':id/assignments')
  @ApiOperation({ summary: 'List all assignments for an invitation (Assignment Board)' })
  findByInvitation(@Param('id') id: string) {
    return this.assignmentsService.findByInvitation(id);
  }
}

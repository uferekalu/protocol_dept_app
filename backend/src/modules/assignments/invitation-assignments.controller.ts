import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';

// Lives in AssignmentsModule (not InvitationsModule) to avoid a circular module
// dependency — AssignmentsModule already depends on InvitationsService for referential
// checks, so InvitationsModule can't depend back on AssignmentsModule. Nest doesn't
// require a route's URL prefix to match the module that "owns" the resource, so this
// still delivers GET /invitations/:id/assignments cleanly.
@ApiTags('invitations')
@Controller('invitations')
export class InvitationAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(':id/assignments')
  @ApiOperation({ summary: 'List all assignments for an invitation (Assignment Board)' })
  findByInvitation(@Param('id') id: string) {
    return this.assignmentsService.findByInvitation(id);
  }
}

import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';

// Lives in AssignmentsModule for the same circular-dependency reason as
// InvitationAssignmentsController — see that file's comment.
@ApiTags('protocol-members')
@Controller('protocol-members')
export class ProtocolMemberAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(':id/assignments')
  @ApiOperation({ summary: "List a protocol member's assignments (My Assignments)" })
  findByProtocolMember(@Param('id') id: string) {
    return this.assignmentsService.findByProtocolMember(id);
  }
}

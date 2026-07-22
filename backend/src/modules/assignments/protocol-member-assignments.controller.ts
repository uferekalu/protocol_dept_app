import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ProtocolMemberRole } from '../../common/enums';

const ELEVATED_ROLES = [ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR];

// Lives in AssignmentsModule for the same circular-dependency reason as
// InvitationAssignmentsController — see that file's comment.
//
// "My Assignments" — a MEMBER may only fetch their own list (brief Section 4G: "sees
// only their own assignments"); ADMIN/COORDINATOR can view anyone's. Ownership check
// only, no RolesGuard here — any authenticated role may call this for their own id.
@ApiTags('protocol-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('protocol-members')
export class ProtocolMemberAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(':id/assignments')
  @ApiOperation({ summary: "List a protocol member's assignments (My Assignments)" })
  findByProtocolMember(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const isSelf = user.sub === id;
    if (!isSelf && !ELEVATED_ROLES.includes(user.role)) {
      throw new ForbiddenException('You can only view your own assignments');
    }
    return this.assignmentsService.findByProtocolMember(id);
  }
}

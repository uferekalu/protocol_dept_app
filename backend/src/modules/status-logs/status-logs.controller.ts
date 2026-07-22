import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatusLogsService } from './status-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Read-only by design: entries are only ever written internally by InvitationsService
// as part of a guarded status transition (see StatusLogsService). No POST/PATCH/DELETE
// route exists here — that's the enforcement mechanism, not an auth guard. Open to any
// authenticated role (no @Roles()) — viewing a timeline isn't restricted per the brief.
@ApiTags('status-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('status-logs')
export class StatusLogsController {
  constructor(private readonly statusLogsService: StatusLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List status log entries for an invitation' })
  findByInvitation(@Query('invitation_id') invitationId: string) {
    return this.statusLogsService.findByInvitation(invitationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single status log entry' })
  findOne(@Param('id') id: string) {
    return this.statusLogsService.findOne(id);
  }
}

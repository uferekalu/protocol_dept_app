import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatusLogsService } from './status-logs.service';

// Read-only by design: entries are only ever written internally by InvitationsService
// as part of a guarded status transition (see StatusLogsService). No POST/PATCH/DELETE
// route exists here — that's the enforcement mechanism, not an auth guard.
@ApiTags('status-logs')
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

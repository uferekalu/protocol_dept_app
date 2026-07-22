import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { StatusLogsService } from '../status-logs/status-logs.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ProtocolMemberRole } from '../../common/enums';

// Every route requires login. Creating/editing/deleting an invitation is
// ADMIN/COORDINATOR-only; reading and the status-transition endpoint are open to any
// authenticated role — brief Section 4B explicitly allows "the assigned Protocol
// member" (which can be a MEMBER) to do manual status updates, unlike Assignment
// management proper.
@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly statusLogsService: StatusLogsService,
  ) {}

  @Post()
  @Roles(ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR)
  @ApiOperation({ summary: 'Create an invitation (links a minister to an event)' })
  @ApiConflictResponse({ description: 'This minister already has an invitation for this event' })
  create(@Body() createInvitationDto: CreateInvitationDto) {
    return this.invitationsService.create(createInvitationDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all invitations, optionally filtered by minister and/or event' })
  findAll(
    @Query('minister_id') ministerId?: string,
    @Query('event_id') eventId?: string,
  ) {
    return this.invitationsService.findAll(ministerId, eventId);
  }

  @Get('currently-hosting')
  @ApiOperation({ summary: 'List invitations not yet at Departed / Trip Completed' })
  findCurrentlyHosting() {
    return this.invitationsService.findCurrentlyHosting();
  }

  // Declared before ':id' so "export" is matched as this static path, not captured as
  // an :id param — same reasoning as 'currently-hosting' above.
  @Get('export')
  @ApiOperation({ summary: 'Export the invited-minister list for an event as a CSV file' })
  async exportByEvent(
    @Query('event_id') eventId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    if (!eventId) {
      throw new BadRequestException('event_id query parameter is required');
    }
    const { csv, filename } = await this.invitationsService.exportByEvent(eventId);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invitation' })
  findOne(@Param('id') id: string) {
    return this.invitationsService.findOne(id);
  }

  @Get(':id/status-logs')
  @ApiOperation({ summary: 'Get the status timeline for an invitation, most recent first' })
  findStatusLogs(@Param('id') id: string) {
    return this.statusLogsService.findByInvitation(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Move an invitation to its next status (state-machine guarded)' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateInvitationStatusDto: UpdateInvitationStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationsService.updateStatus(id, updateInvitationStatusDto, user.sub);
  }

  @Patch(':id')
  @Roles(ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR)
  @ApiOperation({ summary: 'Update invitation details (hotel, dates, preaching schedule)' })
  @ApiConflictResponse({ description: 'This minister already has an invitation for this event' })
  update(@Param('id') id: string, @Body() updateInvitationDto: UpdateInvitationDto) {
    return this.invitationsService.update(id, updateInvitationDto);
  }

  @Delete(':id')
  @Roles(ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invitation' })
  remove(@Param('id') id: string) {
    return this.invitationsService.remove(id);
  }
}

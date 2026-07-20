import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { StatusLogsService } from '../status-logs/status-logs.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly statusLogsService: StatusLogsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an invitation (links a minister to an event)' })
  @ApiConflictResponse({ description: 'This minister already has an invitation for this event' })
  create(@Body() createInvitationDto: CreateInvitationDto) {
    return this.invitationsService.create(createInvitationDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all invitations' })
  findAll() {
    return this.invitationsService.findAll();
  }

  @Get('currently-hosting')
  @ApiOperation({ summary: 'List invitations not yet at Departed / Trip Completed' })
  findCurrentlyHosting() {
    return this.invitationsService.findCurrentlyHosting();
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
  ) {
    return this.invitationsService.updateStatus(id, updateInvitationStatusDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update invitation details (hotel, dates, preaching schedule)' })
  @ApiConflictResponse({ description: 'This minister already has an invitation for this event' })
  update(@Param('id') id: string, @Body() updateInvitationDto: UpdateInvitationDto) {
    return this.invitationsService.update(id, updateInvitationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invitation' })
  remove(@Param('id') id: string) {
    return this.invitationsService.remove(id);
  }
}

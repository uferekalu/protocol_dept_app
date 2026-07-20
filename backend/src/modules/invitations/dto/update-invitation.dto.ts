import { PartialType } from '@nestjs/swagger';
import { CreateInvitationDto } from './create-invitation.dto';

// Deliberately does NOT include `status` — status can only move through
// InvitationsService.updateStatus() via UpdateInvitationStatusDto, which enforces the
// state machine. This DTO covers hotel/date/preaching-schedule edits and reassigning
// minister_id/event_id (per the brief's "Create/Edit Invitation" screen).
export class UpdateInvitationDto extends PartialType(CreateInvitationDto) {}

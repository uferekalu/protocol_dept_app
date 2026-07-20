import { PartialType } from '@nestjs/swagger';
import { CreateAssignmentDto } from './create-assignment.dto';

// Deliberately does NOT include `status` or `actual_time_completed` — those can only
// change through AssignmentsService.updateStatus() via UpdateAssignmentStatusDto, which
// enforces the transition guard and server-stamps the completion timestamp. This DTO
// covers reassignment (protocol_member_id), rescheduling (scheduled_time), and notes.
export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {}

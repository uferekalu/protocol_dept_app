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
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';

@ApiTags('assignments')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a protocol member to a leg of an invitation' })
  @ApiConflictResponse({
    description: 'An assignment of this type already exists for this invitation at this time',
  })
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all assignments' })
  findAll() {
    return this.assignmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single assignment' })
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Move an assignment to its next status (transition-guarded)' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateAssignmentStatusDto: UpdateAssignmentStatusDto,
  ) {
    return this.assignmentsService.updateStatus(id, updateAssignmentStatusDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update assignment details (reassign, reschedule, notes)' })
  @ApiConflictResponse({
    description: 'An assignment of this type already exists for this invitation at this time',
  })
  update(@Param('id') id: string, @Body() updateAssignmentDto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, updateAssignmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assignment' })
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }
}

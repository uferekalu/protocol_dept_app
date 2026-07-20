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
import { ProtocolMembersService } from './protocol-members.service';
import { CreateProtocolMemberDto } from './dto/create-protocol-member.dto';
import { UpdateProtocolMemberDto } from './dto/update-protocol-member.dto';

@ApiTags('protocol-members')
@Controller('protocol-members')
export class ProtocolMembersController {
  constructor(private readonly protocolMembersService: ProtocolMembersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a protocol member account' })
  @ApiConflictResponse({ description: 'A protocol member with this phone number already exists' })
  create(@Body() createProtocolMemberDto: CreateProtocolMemberDto) {
    return this.protocolMembersService.create(createProtocolMemberDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all protocol members' })
  findAll() {
    return this.protocolMembersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single protocol member' })
  findOne(@Param('id') id: string) {
    return this.protocolMembersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a protocol member' })
  @ApiConflictResponse({ description: 'A protocol member with this phone number already exists' })
  update(
    @Param('id') id: string,
    @Body() updateProtocolMemberDto: UpdateProtocolMemberDto,
  ) {
    return this.protocolMembersService.update(id, updateProtocolMemberDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a protocol member' })
  remove(@Param('id') id: string) {
    return this.protocolMembersService.remove(id);
  }
}

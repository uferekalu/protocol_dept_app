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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MinistersService } from './ministers.service';
import { CreateMinisterDto } from './dto/create-minister.dto';
import { UpdateMinisterDto } from './dto/update-minister.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProtocolMemberRole } from '../../common/enums';

// Every route requires login; write routes are further restricted to ADMIN/COORDINATOR
// per the brief's Section 4G — reading (browsing/looking up a minister) is open to any
// authenticated role, including MEMBER, since a driver needs to know who they're
// picking up.
@ApiTags('ministers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ministers')
export class MinistersController {
  constructor(private readonly ministersService: MinistersService) {}

  @Post()
  @Roles(ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR)
  @ApiOperation({ summary: 'Create a minister profile' })
  @ApiConflictResponse({ description: 'A minister with this phone number already exists' })
  create(@Body() createMinisterDto: CreateMinisterDto) {
    return this.ministersService.create(createMinisterDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all minister profiles' })
  findAll() {
    return this.ministersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single minister profile' })
  findOne(@Param('id') id: string) {
    return this.ministersService.findOne(id);
  }

  @Patch(':id')
  @Roles(ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR)
  @ApiOperation({ summary: 'Update a minister profile' })
  @ApiConflictResponse({ description: 'A minister with this phone number already exists' })
  update(@Param('id') id: string, @Body() updateMinisterDto: UpdateMinisterDto) {
    return this.ministersService.update(id, updateMinisterDto);
  }

  @Delete(':id')
  @Roles(ProtocolMemberRole.ADMIN, ProtocolMemberRole.COORDINATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a minister profile' })
  remove(@Param('id') id: string) {
    return this.ministersService.remove(id);
  }
}

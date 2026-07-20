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
import { MinistersService } from './ministers.service';
import { CreateMinisterDto } from './dto/create-minister.dto';
import { UpdateMinisterDto } from './dto/update-minister.dto';

@ApiTags('ministers')
@Controller('ministers')
export class MinistersController {
  constructor(private readonly ministersService: MinistersService) {}

  @Post()
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
  @ApiOperation({ summary: 'Update a minister profile' })
  @ApiConflictResponse({ description: 'A minister with this phone number already exists' })
  update(@Param('id') id: string, @Body() updateMinisterDto: UpdateMinisterDto) {
    return this.ministersService.update(id, updateMinisterDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a minister profile' })
  remove(@Param('id') id: string) {
    return this.ministersService.remove(id);
  }
}

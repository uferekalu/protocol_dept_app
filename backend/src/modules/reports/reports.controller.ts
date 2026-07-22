import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// Read-only, so — like every other GET endpoint in this app — open to any
// authenticated role, not just ADMIN/COORDINATOR. RolesGuard is included for
// consistency with the rest of the codebase even though no route here uses @Roles().
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('history')
  @ApiOperation({ summary: 'Full historical archive of every invitation ever created' })
  getHistory() {
    return this.reportsService.getHistory();
  }

  @Get('stats')
  @ApiOperation({
    summary:
      'Simple aggregate stats: days hosted per minister, most active protocol members, average pickup-to-check-in time',
  })
  getStats() {
    return this.reportsService.getStats();
  }
}

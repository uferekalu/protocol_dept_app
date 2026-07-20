import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatusLogsController } from './status-logs.controller';
import { StatusLogsService } from './status-logs.service';
import { StatusLog, StatusLogSchema } from './schemas/status-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StatusLog.name, schema: StatusLogSchema }]),
  ],
  controllers: [StatusLogsController],
  providers: [StatusLogsService],
  exports: [StatusLogsService],
})
export class StatusLogsModule {}

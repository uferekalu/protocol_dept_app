import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinistersController } from './ministers.controller';
import { MinistersService } from './ministers.service';
import { Minister, MinisterSchema } from './schemas/minister.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Minister.name, schema: MinisterSchema }]),
  ],
  controllers: [MinistersController],
  providers: [MinistersService],
  exports: [MinistersService],
})
export class MinistersModule {}

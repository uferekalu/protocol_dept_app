import { PartialType } from '@nestjs/swagger';
import { CreateMinisterDto } from './create-minister.dto';

export class UpdateMinisterDto extends PartialType(CreateMinisterDto) {}

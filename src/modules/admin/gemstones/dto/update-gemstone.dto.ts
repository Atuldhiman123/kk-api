import { PartialType } from '@nestjs/swagger';
import { CreateGemstoneDto } from './create-gemstone.dto';

export class UpdateGemstoneDto extends PartialType(CreateGemstoneDto) {}

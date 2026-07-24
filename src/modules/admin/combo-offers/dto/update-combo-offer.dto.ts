import { PartialType } from '@nestjs/swagger';
import { CreateComboOfferDto } from './create-combo-offer.dto';

export class UpdateComboOfferDto extends PartialType(CreateComboOfferDto) {}

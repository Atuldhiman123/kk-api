import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AstrologyService } from './astrology.service';
import { GenerateChartDto } from './dto/generate-chart.dto';
import { AstrologyChartResponse } from './interfaces/astrology.interfaces';

@ApiTags('astrology')
@Controller('astrology')
export class AstrologyController {
  constructor(private readonly astrologyService: AstrologyService) {}

  @Post('chart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Vedic Astrology Birth Chart',
    description:
      'Calculates Ascendant/Lagna, planetary positions, houses, nakshatras, and dasha details for the given birth data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chart generated and normalized successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid birth details provided',
  })
  @ApiResponse({
    status: 502,
    description: 'Upstream astrology computation service error',
  })
  @ApiResponse({
    status: 504,
    description: 'Upstream astrology computation service timed out',
  })
  generateChart(@Body() dto: GenerateChartDto): Promise<AstrologyChartResponse> {
    return this.astrologyService.generateChart(dto);
  }
}

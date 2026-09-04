import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';
import { QueryKnowledgeDto } from './dto/query-knowledge.dto';

@ApiTags('knowledge')
@Controller()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // --- Public / AI Search Endpoint ---
  @Post('ai/knowledge/search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Semantic vector search in astrology knowledge base' })
  @ApiResponse({ status: 200, description: 'Matching astrology knowledge chunks returned' })
  search(@Body() dto: SearchKnowledgeDto) {
    return this.knowledgeService.search(dto.query, dto.topK, dto.minSimilarity, dto.category);
  }

  // --- Protected Knowledge Ingestion (Admin or Backend) ---
  @Post('ai/knowledge')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'Ingest knowledge entry with automatic pgvector embedding (Admin only)' })
  create(@Body() dto: CreateKnowledgeDto) {
    return this.knowledgeService.create(dto);
  }

  // --- Protected Admin CRUD Endpoints ---
  @Get('admin/knowledge')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'List and filter knowledge base entries (Admin only)' })
  findAll(@Query() dto: QueryKnowledgeDto) {
    return this.knowledgeService.findAll(dto);
  }

  @Get('admin/knowledge/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'Get single knowledge record by ID (Admin only)' })
  findById(@Param('id') id: string) {
    return this.knowledgeService.findById(id);
  }

  @Post('admin/knowledge')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'Create new knowledge entry (Admin only)' })
  adminCreate(@Body() dto: CreateKnowledgeDto) {
    return this.knowledgeService.create(dto);
  }

  @Patch('admin/knowledge/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'Update knowledge entry and recompute embedding (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeDto) {
    return this.knowledgeService.update(id, dto);
  }

  @Delete('admin/knowledge/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'Delete knowledge entry (Admin only)' })
  remove(@Param('id') id: string) {
    return this.knowledgeService.remove(id);
  }

  @Post('admin/knowledge/:id/regenerate-embedding')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'Regenerate vector embedding for a knowledge entry (Admin only)' })
  regenerateEmbedding(@Param('id') id: string) {
    return this.knowledgeService.regenerateEmbedding(id);
  }
}

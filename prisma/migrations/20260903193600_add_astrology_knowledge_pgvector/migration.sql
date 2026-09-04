-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE IF NOT EXISTS "astrology_knowledge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "source" TEXT,
    "metadata" JSONB,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "astrology_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "astrology_knowledge_category_idx" ON "astrology_knowledge"("category");

-- Create HNSW vector similarity index for cosine distance
CREATE INDEX IF NOT EXISTS "astrology_knowledge_embedding_idx" ON "astrology_knowledge" USING hnsw ("embedding" vector_cosine_ops);

# Kundli Kendra - Astrology, AI Chatbot & RAG Knowledge Base Backend Documentation

This document provides complete documentation for the Astrology Module, AI Chatbot Engine, and **Astrology Knowledge Base + pgvector RAG (Retrieval-Augmented Generation) System** in NestJS (`kk-api`).

---

## 🌟 Architecture & RAG Pipeline Flow

The backend architecture combines three decoupled layers:

```
User Question (POST /ai/chat)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. RAG Knowledge Retrieval (RagService + KnowledgeService)   │
│    - Embeds question via EmbeddingService (1536-dim vector) │
│    - Queries PostgreSQL pgvector with cosine similarity      │
│    - Retrieves top matching astrology rules/interpretations  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Kundli Calculation (AstrologyService - In-Memory)        │
│    - If birth details provided: calculates Lagna, Planets,  │
│      Houses, Nakshatras, & Dashas via Swiss Ephemeris data  │
│    - If omitted: skips calculation (usedBirthChart: false)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AI Completion Orchestration (AiService)                  │
│    - Assembles prompt with:                                 │
│      * System Vedic Astrologer Instructions                 │
│      * RELEVANT ASTROLOGY KNOWLEDGE (from pgvector)         │
│      * KUNDLI DATA (normalized Swiss Ephemeris chart)        │
│      * USER QUESTION                                        │
│    - Sends to OpenAI / OpenAI-compatible LLM endpoint       │
│    - Returns structured answer to client                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐘 PostgreSQL & pgvector Setup

1. **pgvector Extension**:
   - Activated in PostgreSQL:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```
2. **Table Schema**: `astrology_knowledge`
   - Stores title, content, category, source, metadata JSON, and `vector(1536)` embedding.
3. **Vector Index**:
   - High-performance HNSW index for sub-millisecond approximate nearest neighbor cosine similarity search:
     ```sql
     CREATE INDEX IF NOT EXISTS astrology_knowledge_embedding_idx 
     ON astrology_knowledge USING hnsw (embedding vector_cosine_ops);
     ```
4. **Prisma Integration**:
   - Managed via Prisma schema model `AstrologyKnowledge` and migration `20260903193600_add_astrology_knowledge_pgvector`.

---

## 📡 API Endpoints Reference

### 1. **POST** `/ai/chat` (AI Chatbot with RAG & Chart Context)
Receives user questions, retrieves relevant astrology knowledge via vector search, optionally computes the user's birth chart, and returns an AI answer.

#### **Request Body:**
```json
{
  "message": "What does Saturn in my 7th house mean for marriage?",
  "conversationId": "optional-uuid",
  "birthDetails": {
    "dateOfBirth": "1990-04-15",
    "timeOfBirth": "08:30",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": 5.5
  }
}
```

#### **Response Body (`200 OK`):**
```json
{
  "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "message": "According to Vedic astrology, the 7th house (Kalatra Bhava) governs marriage, partnerships, and commitment. In your chart with a Taurus Ascendant and Saturn in Capricorn, Saturn in the 7th house signifies a desire for enduring, stable relationships...",
  "usedBirthChart": true
}
```

---

### 2. **POST** `/ai/knowledge/search` (Semantic Search)
Performs vector similarity search against the astrology knowledge base.

#### **Request Body:**
```json
{
  "query": "What does the 7th house represent in marriage?",
  "topK": 5,
  "minSimilarity": 0.45,
  "category": "house"
}
```

#### **Response Body (`200 OK`):**
```json
{
  "query": "What does the 7th house represent in marriage?",
  "totalResults": 2,
  "results": [
    {
      "id": "uuid-1",
      "title": "7th House (Jaya / Kalatra Bhava) in Vedic Astrology",
      "content": "The 7th house governs marriage, spouse, long-term relationships, business partnerships, commercial contracts, and public interactions...",
      "category": "house",
      "source": "General Vedic Astrology Knowledge",
      "similarity": 0.8924
    }
  ]
}
```

---

### 3. **POST** `/ai/knowledge` or `POST /admin/knowledge` (Knowledge Ingestion - Admin Only)
Ingests a new astrological entry, automatically generating its 1536-dimensional vector embedding and storing it in PostgreSQL.

*Requires Bearer Token from `POST /auth/login`*

#### **Request Body:**
```json
{
  "title": "7th House in Vedic Astrology",
  "category": "house",
  "content": "The 7th house represents marriage, spouse, partnerships, business partnerships and public dealings.",
  "source": "Kundli Kendra Astrology Knowledge",
  "metadata": { "tags": ["marriage", "7th_house"] }
}
```

---

### 4. Admin Knowledge Management Endpoints (Admin Only)
* **`GET /admin/knowledge`**: List and paginate knowledge entries (supports `?category=...` and `?search=...`).
* **`GET /admin/knowledge/:id`**: Retrieve single knowledge record.
* **`PATCH /admin/knowledge/:id`**: Update entry (automatically regenerates embedding if title or content changes).
* **`DELETE /admin/knowledge/:id`**: Remove entry from knowledge base.
* **`POST /admin/knowledge/:id/regenerate-embedding`**: Re-computes vector embedding.

---

## ⚙️ Environment Variables (`.env`)

Add the following to your backend `.env` file in `kk-api`:

```env
# AI Provider Configuration (OpenAI or OpenAI-compatible)
AI_API_KEY=your_ai_api_key_here
AI_MODEL=gpt-4o-mini
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_BASE_URL=https://api.openai.com/v1

# RAG Configuration (Optional overrides)
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.42

# VedIntel Swiss Ephemeris Astrology API Key
VEDINTEL_API_KEY=your_vedintel_api_key_here
```

---

## 🛠️ Commands

### 1. Apply Database Migration
```bash
npx prisma migrate deploy
```

### 2. Seed Knowledge Base (20 Core Vedic Astrology Entries)
```bash
node prisma/seed-knowledge.js
```

### 3. Run Test Suites
```bash
npm run test
npm run test:e2e
```

### 4. Build Production Bundle
```bash
npm run build
```

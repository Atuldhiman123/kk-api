export interface KnowledgeRecord {
  id: string;
  title: string;
  content: string;
  category: string;
  source?: string | null;
  metadata?: Record<string, any> | null;
  similarity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KnowledgeSearchResult {
  query: string;
  totalResults: number;
  results: KnowledgeRecord[];
}

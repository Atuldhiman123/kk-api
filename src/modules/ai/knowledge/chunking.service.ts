import { Injectable } from '@nestjs/common';

export interface ChunkResult {
  chunk: string;
  chunkIndex: number;
  totalChunks: number;
}

@Injectable()
export class ChunkingService {
  /**
   * Splits long text into meaningful astrological chunks by paragraph or sentence boundary
   */
  chunkText(text: string, maxChunkSize = 900, overlap = 150): ChunkResult[] {
    const trimmed = text.trim();
    if (trimmed.length <= maxChunkSize) {
      return [{ chunk: trimmed, chunkIndex: 0, totalChunks: 1 }];
    }

    const paragraphs = trimmed.split(/\n\s*\n/);
    const rawChunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
      if ((current + '\n\n' + para).trim().length <= maxChunkSize) {
        current = current ? current + '\n\n' + para : para;
      } else {
        if (current) rawChunks.push(current.trim());
        // If paragraph itself is too large, split by sentences
        if (para.length > maxChunkSize) {
          const sentences = para.split(/(?<=[.?!])\s+/);
          let sentenceChunk = '';
          for (const s of sentences) {
            if ((sentenceChunk + ' ' + s).trim().length <= maxChunkSize) {
              sentenceChunk = sentenceChunk ? sentenceChunk + ' ' + s : s;
            } else {
              if (sentenceChunk) rawChunks.push(sentenceChunk.trim());
              sentenceChunk = s;
            }
          }
          if (sentenceChunk) current = sentenceChunk;
        } else {
          current = para;
        }
      }
    }
    if (current) rawChunks.push(current.trim());

    return rawChunks.map((chunk, idx) => ({
      chunk,
      chunkIndex: idx,
      totalChunks: rawChunks.length,
    }));
  }
}

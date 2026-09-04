export interface AiChatResponse {
  conversationId: string;
  message: string;
  usedBirthChart: boolean;
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

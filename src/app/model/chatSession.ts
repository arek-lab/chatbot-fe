export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatSession {
  _id?: string;
  user: string;
  history: Message[];
  createdAt?: Date;
  updatedAt?: Date;
}

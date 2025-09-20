import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const gateway = createOpenRouter({
  apiKey: process.env.AI_API_KEY!,
});

export const myProvider = customProvider({
  languageModels: {
    'chat-model': gateway.chat(process.env.AI_MODEL || ""),
    'chat-model-reasoning': wrapLanguageModel({
      model: gateway.chat(process.env.AI_MODEL || ""),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': gateway.chat(process.env.AI_MODEL || ""),
    'artifact-model': gateway.chat(process.env.AI_MODEL || ""),
  },
});
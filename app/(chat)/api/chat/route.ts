import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { updateChatLastContextById } from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { logger, formatError, createChatMetadata } from '@/lib/logging';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';
import { unstable_cache as cache } from 'next/cache';
import { fetchModels } from 'tokenlens/fetch';
import { getUsage } from 'tokenlens/helpers';
import type { ModelCatalog } from 'tokenlens/core';
import type { AppUsage } from '@/lib/usage';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      logger.warn('TokenLens: catalog fetch failed, using default catalog', {
        error: err,
        component: 'tokenlens-catalog'
      });
      return undefined; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ['tokenlens-catalog'],
  { revalidate: 24 * 60 * 60 }, // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        logger.info('Resumable streams are disabled due to missing REDIS_URL', {
          component: 'resumable-streams'
        });
      } else {
        logger.error('Failed to create resumable stream context', {
          ...formatError(error),
          component: 'resumable-streams'
        });
      }
    }
  }

  return globalStreamContext;
}

async function handlePOST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
    
    // Log parsed request details
    logger.info('Chat API request parsed', {
      requestId,
      messageId: requestBody.id,
      messageType: requestBody.message?.role,
      messagePartsCount: requestBody.message?.parts?.length || 0,
      selectedModel: requestBody.selectedChatModel,
      visibility: requestBody.selectedVisibilityType
    });
    
  } catch (error) {
    logger.error('Failed to parse request body', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    });
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      logger.warn('Unauthorized chat request', { requestId });
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      logger.warn('Rate limit exceeded', { 
        requestId, 
        userId: session.user.id,
        messageCount,
        limit: entitlementsByUserType[userType].maxMessagesPerDay
      });
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({ type: 'data-usage', data: finalMergedUsage });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({ type: 'data-usage', data: finalMergedUsage });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: 'data-usage', data: finalMergedUsage });
            } catch (err) {
              logger.warn('TokenLens enrichment failed', {
                error: err,
                component: 'tokenlens-enrichment'
              });
              finalMergedUsage = usage;
              dataStream.write({ type: 'data-usage', data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            logger.warn('Unable to persist last usage for chat', {
              chatId: id,
              error: err,
              component: 'chat-persistence'
            });
          }
        }
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      logger.info('Streaming chat response (resumable)', {
        requestId,
        streamId,
        chatId: id,
        model: selectedChatModel,
        hasStreamContext: true
      });
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      logger.info('Streaming chat response', {
        requestId,
        chatId: id,
        model: selectedChatModel,
        hasStreamContext: false
      });
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      logger.warn('Chat SDK error occurred', {
        requestId,
        errorMessage: error.message
      });
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        'AI Gateway requires a valid credit card on file to service requests',
      )
    ) {
      logger.error('AI Gateway credit card error', {
        requestId,
        error: error.message
      });
      return new ChatSDKError('bad_request:activate_gateway').toResponse();
    }

    logger.error('Unhandled error in chat API', {
      requestId,
      ...formatError(error as Error),
      component: 'chat-api'
    });
    return new ChatSDKError('offline:chat').toResponse();
  }
}

async function handleDELETE(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  logger.info('Delete chat request', {
    requestId,
    chatId: id
  });

  if (!id) {
    logger.warn('Delete request missing chat ID', { requestId });
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    logger.warn('Unauthorized delete request', { requestId });
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    logger.warn('Forbidden delete request', { 
      requestId, 
      chatId: id,
      userId: session.user.id,
      chatOwnerId: chat?.userId
    });
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  logger.info('Chat deleted successfully', {
    requestId,
    chatId: id,
    userId: session.user.id
  });

  return Response.json(deletedChat, { status: 200 });
}

// Export handlers directly (logging is handled internally)
export const POST = handlePOST;
export const DELETE = handleDELETE;

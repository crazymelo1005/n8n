import type { ChatHubLLMProvider, ChatModelMetadataDto } from '@n8n/api-types';
import type { ExecutionStatus, INodeTypeNameVersion } from 'n8n-workflow';
import MODEL_METADATA_JSON from './model-metadata.json';

export const EXECUTION_POLL_INTERVAL = 1000;
export const EXECUTION_FINISHED_STATUSES: ExecutionStatus[] = [
	'canceled',
	'crashed',
	'error',
	'success',
];
export const TOOLS_AGENT_NODE_MIN_VERSION = 2.2;
export const CHAT_TRIGGER_NODE_MIN_VERSION = 1.2;

export const PROVIDER_NODE_TYPE_MAP: Record<ChatHubLLMProvider, INodeTypeNameVersion> = {
	openai: {
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		version: 1.3,
	},
	anthropic: {
		name: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		version: 1.3,
	},
	google: {
		name: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		version: 1.2,
	},
	ollama: {
		name: '@n8n/n8n-nodes-langchain.lmChatOllama',
		version: 1,
	},
	azureOpenAi: {
		name: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
		version: 1,
	},
	azureEntraId: {
		name: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
		version: 1,
	},
	awsBedrock: {
		name: '@n8n/n8n-nodes-langchain.lmChatAwsBedrock',
		version: 1.1,
	},
	vercelAiGateway: {
		name: '@n8n/n8n-nodes-langchain.lmChatVercelAiGateway',
		version: 1,
	},
	xAiGrok: {
		name: '@n8n/n8n-nodes-langchain.lmChatXAiGrok',
		version: 1,
	},
	groq: {
		name: '@n8n/n8n-nodes-langchain.lmChatGroq',
		version: 1,
	},
	openRouter: {
		name: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
		version: 1,
	},
	deepSeek: {
		name: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
		version: 1,
	},
	cohere: {
		name: '@n8n/n8n-nodes-langchain.lmChatCohere',
		version: 1,
	},
	mistralCloud: {
		name: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
		version: 1,
	},
};

export const NODE_NAMES = {
	CHAT_TRIGGER: 'When chat message received',
	REPLY_AGENT: 'AI Agent',
	TITLE_GENERATOR_AGENT: 'Title Generator Agent',
	CHAT_MODEL: 'Chat Model',
	MEMORY: 'Memory',
	RESTORE_CHAT_MEMORY: 'Restore Chat Memory',
	CLEAR_CHAT_MEMORY: 'Clear Chat Memory',
	MERGE: 'Merge',
} as const;

/* eslint-disable @typescript-eslint/naming-convention */
export const JSONL_STREAM_HEADERS = {
	'Content-Type': 'application/json-lines; charset=utf-8',
	'Transfer-Encoding': 'chunked',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive',
};
/* eslint-enable @typescript-eslint/naming-convention */

// Default metadata for all models
const DEFAULT_MODEL_METADATA: ChatModelMetadataDto = {
	inputModalities: ['text', 'image', 'audio', 'video', 'file'],
	capabilities: {
		functionCalling: true,
	},
	available: true,
};

const MODEL_METADATA = MODEL_METADATA_JSON as Partial<
	Record<ChatHubLLMProvider, Partial<Record<string, Partial<ChatModelMetadataDto>>>>
>;

export function getModelMetadata(
	provider: ChatHubLLMProvider,
	modelId: string,
): ChatModelMetadataDto {
	const providerModels = MODEL_METADATA[provider];
	const modelOverride = providerModels?.[modelId];

	if (!modelOverride) {
		return DEFAULT_MODEL_METADATA;
	}

	// Merge override with default metadata
	return {
		inputModalities: modelOverride.inputModalities ?? DEFAULT_MODEL_METADATA.inputModalities,
		capabilities: {
			functionCalling:
				modelOverride.capabilities?.functionCalling ??
				DEFAULT_MODEL_METADATA.capabilities.functionCalling,
		},
		available: modelOverride.available ?? true,
	};
}

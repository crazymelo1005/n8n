<script setup lang="ts">
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { N8nButton, N8nText } from '@n8n/design-system';
import { computed, ref, onMounted, useTemplateRef } from 'vue';
import ChatLayout from '@/features/ai/chatHub/components/ChatLayout.vue';
import ChatKnowledgeItemCard from '@/features/ai/chatHub/components/ChatKnowledgeItemCard.vue';
import SkeletonKnowledgeItemCard from '@/features/ai/chatHub/components/SkeletonKnowledgeItemCard.vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ChatHubKnowledgeItemDto } from '@n8n/api-types';
import { fetchKnowledgeItemsApi, createKnowledgeItemApi, deleteKnowledgeItemApi } from './chat.api';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import { useFileDrop } from '@/features/ai/chatHub/composables/useFileDrop';
import { useI18n } from '@n8n/i18n';

const rootStore = useRootStore();
const toast = useToast();
const message = useMessage();
const i18n = useI18n();
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

const knowledgeItems = ref<ChatHubKnowledgeItemDto[]>([]);
const isLoading = ref(false);
const isCreating = ref(false);

const hasItems = computed(() => knowledgeItems.value.length > 0);
const canAcceptFiles = computed(() => !isCreating.value);

async function loadKnowledgeItems() {
	isLoading.value = true;
	try {
		knowledgeItems.value = await fetchKnowledgeItemsApi(rootStore.restApiContext);
	} catch (error) {
		toast.showError(error, 'Failed to load knowledge items');
	} finally {
		isLoading.value = false;
	}
}

function handleClickAddItem() {
	fileInputRef.value?.click();
}

async function createKnowledgeItemFromFile(file: File) {
	const binaryData = await convertFileToBinaryData(file);

	const newItem = await createKnowledgeItemApi(rootStore.restApiContext, {
		attachment: binaryData,
	});
	knowledgeItems.value.unshift(newItem);
}

async function handleFileSelect(e: Event) {
	const target = e.target as HTMLInputElement;
	const files = target.files;

	if (!files || files.length === 0) {
		return;
	}

	isCreating.value = true;
	try {
		const file = files[0];
		await createKnowledgeItemFromFile(file);
		toast.showMessage({ type: 'success', title: 'Knowledge item created' });
	} catch (error) {
		toast.showError(error, 'Failed to create knowledge item');
	} finally {
		isCreating.value = false;
		// Reset input
		if (target) {
			target.value = '';
		}
	}
}

async function onFilesDropped(files: File[]) {
	if (files.length === 0) {
		return;
	}

	isCreating.value = true;
	try {
		// Process files sequentially to avoid overwhelming the server
		for (const file of files) {
			await createKnowledgeItemFromFile(file);
		}
		toast.showMessage({
			type: 'success',
			title:
				files.length === 1 ? 'Knowledge item created' : `${files.length} knowledge items created`,
		});
	} catch (error) {
		toast.showError(error, 'Failed to create knowledge item');
	} finally {
		isCreating.value = false;
	}
}

async function handleDeleteItem(id: string) {
	const confirmed = await message.confirm(
		'Are you sure you want to delete this knowledge item?',
		'Delete Knowledge Item',
		{
			confirmButtonText: 'Delete',
			cancelButtonText: 'Cancel',
		},
	);

	if (confirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		await deleteKnowledgeItemApi(rootStore.restApiContext, id);
		knowledgeItems.value = knowledgeItems.value.filter((item) => item.id !== id);
		toast.showMessage({ type: 'success', title: 'Knowledge item deleted' });
	} catch (error) {
		toast.showError(error, 'Failed to delete knowledge item');
	}
}

function formatDate(dateString: string) {
	return new Date(dateString).toLocaleString();
}

const fileDrop = useFileDrop(canAcceptFiles, onFilesDropped);

onMounted(() => {
	void loadKnowledgeItems();
});
</script>

<template>
	<ChatLayout
		:class="{ [$style.isDraggingFile]: fileDrop.isDragging.value }"
		@dragenter="fileDrop.handleDragEnter"
		@dragleave="fileDrop.handleDragLeave"
		@dragover="fileDrop.handleDragOver"
		@drop="fileDrop.handleDrop"
		@paste="fileDrop.handlePaste"
	>
		<div v-if="fileDrop.isDragging.value" :class="$style.dropOverlay">
			<N8nText size="large" color="text-dark"> Drop files here to add knowledge items </N8nText>
		</div>

		<div :class="$style.container">
			<div :class="$style.header">
				<div :class="$style.headerContent">
					<N8nText tag="h1" size="xlarge" bold>
						{{ i18n.baseText('chatHub.knowledge.title') }}
					</N8nText>
					<N8nText color="text-light">
						{{ i18n.baseText('chatHub.knowledge.description') }}
					</N8nText>
				</div>
				<input
					ref="fileInputRef"
					type="file"
					:class="$style.fileInput"
					@change="handleFileSelect"
				/>
				<N8nButton
					icon="plus"
					type="primary"
					size="medium"
					:loading="isCreating"
					@click="handleClickAddItem"
				>
					{{ i18n.baseText('chatHub.knowledge.button.addItem') }}
				</N8nButton>
			</div>

			<div v-if="isLoading" :class="$style.itemsGrid">
				<SkeletonKnowledgeItemCard v-for="i in 5" :key="i" />
			</div>

			<div v-else-if="!hasItems" :class="$style.empty">
				<N8nText color="text-light" size="medium">
					{{ i18n.baseText('chatHub.knowledge.empty') }}
				</N8nText>
			</div>

			<div v-else :class="$style.itemsGrid">
				<ChatKnowledgeItemCard
					v-for="item in knowledgeItems"
					:key="item.id"
					:item="item"
					@delete="handleDeleteItem(item.id)"
				/>
			</div>
		</div>
	</ChatLayout>
</template>

<style lang="scss" module>
.isDraggingFile {
	position: relative;
}

.container {
	align-self: center;
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	max-width: var(--content-container--width);
	padding: var(--spacing--xl);
	gap: var(--spacing--xl);
	overflow-y: auto;
	position: relative;
}

.fileInput {
	display: none;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--lg);
	width: 100%;
}

.headerContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
	flex: 1;
	width: 100%;
}

.itemsGrid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--spacing--2xs);
}

.dropOverlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: color-mix(in srgb, var(--color--background--light-2) 95%, transparent);
	pointer-events: none;
}
</style>

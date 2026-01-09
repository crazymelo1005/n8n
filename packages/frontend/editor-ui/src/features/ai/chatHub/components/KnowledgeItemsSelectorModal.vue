<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import type { ChatHubKnowledgeItemDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { fetchKnowledgeItemsApi } from '../chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import ChatKnowledgeItemCard from './ChatKnowledgeItemCard.vue';
import SkeletonKnowledgeItemCard from './SkeletonKnowledgeItemCard.vue';

const props = defineProps<{
	modalName: string;
	data: {
		selected: ChatHubKnowledgeItemDto[];
		onConfirm: (items: ChatHubKnowledgeItemDto[]) => void;
	};
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const modalBus = ref(createEventBus());

const allKnowledgeItems = ref<ChatHubKnowledgeItemDto[]>([]);
const selectedIds = ref<Set<string>>(new Set());
const isLoading = ref(false);

const selectedCount = computed(() => selectedIds.value.size);

function toggleItem(itemId: string) {
	if (selectedIds.value.has(itemId)) {
		selectedIds.value.delete(itemId);
	} else {
		selectedIds.value.add(itemId);
	}

	selectedIds.value = new Set(selectedIds.value);
}

function isSelected(itemId: string): boolean {
	return selectedIds.value.has(itemId);
}

function handleConfirm() {
	const selected = allKnowledgeItems.value.filter((item) => selectedIds.value.has(item.id));
	props.data.onConfirm(selected);
	modalBus.value.emit('close');
}

function onCancel() {
	modalBus.value.emit('close');
}

async function loadKnowledgeItems() {
	isLoading.value = true;
	try {
		allKnowledgeItems.value = await fetchKnowledgeItemsApi(rootStore.restApiContext);
	} catch (error) {
		toast.showError(error, 'Failed to load knowledge items');
	} finally {
		isLoading.value = false;
	}
}

watch(
	() => props.data.selected,
	(items: ChatHubKnowledgeItemDto[]) => {
		selectedIds.value = new Set(items.map((item) => item.id));
	},
	{ immediate: true },
);

onMounted(async () => {
	await loadKnowledgeItems();
});
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		width="50%"
		max-width="720px"
		min-height="340px"
		:center="true"
		:loading="isLoading"
	>
		<template #header>
			<div :class="$style.header">
				<N8nIcon icon="library" :size="24" />
				<N8nHeading size="large" color="text-dark">{{
					i18n.baseText('chatHub.knowledge.editor.title')
				}}</N8nHeading>
			</div>
		</template>

		<template #content>
			<div :class="$style.content">
				<N8nText v-if="allKnowledgeItems.length === 0" size="medium" color="text-base">
					{{ i18n.baseText('chatHub.knowledge.editor.empty') }}
				</N8nText>

				<div v-else :class="$style.itemsList">
					<ChatKnowledgeItemCard
						v-for="item in allKnowledgeItems"
						:key="item.id"
						:class="[$style.itemWrapper, { [$style.selected]: isSelected(item.id) }]"
						@click="toggleItem(item.id)"
						:item="item"
						:hide-actions="true"
						size="sm"
					>
						<div v-if="isSelected(item.id)" :class="$style.checkmark">
							<N8nIcon icon="check" :size="16" />
						</div>
					</ChatKnowledgeItemCard>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nText color="text-base">
					{{
						i18n.baseText('chatHub.knowledge.editor.selectedCount', {
							interpolate: { count: selectedCount },
						})
					}}
				</N8nText>
				<div :class="$style.footerRight">
					<N8nButton type="tertiary" @click="onCancel">{{
						i18n.baseText('chatHub.knowledge.editor.cancel')
					}}</N8nButton>
					<N8nButton type="primary" @click="handleConfirm">{{
						i18n.baseText('chatHub.knowledge.editor.confirm')
					}}</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--sm) 0 var(--spacing--md);
}

.itemsList {
	width: 100%;
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--spacing--2xs);
}

.itemWrapper {
	position: relative;
	cursor: pointer;
	transition: box-shadow 0.3s ease;
	border-radius: var(--radius--lg);

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}

	&.selected {
		outline: 2px solid var(--color--primary);
		outline-offset: -2px;
	}
}

.checkmark {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	background-color: var(--color--primary);
	color: white;
	border-radius: 50%;
	z-index: 10;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}

.footerRight {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>

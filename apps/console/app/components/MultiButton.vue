<template>
  <div :class="block ? 'w-full' : ''" class="flex">
    <UButton
      :label="label"
      :loading="loading"
      :disabled="disabled"
      :size="size"
      :color="color"
      :variant="variant"
      :icon="icon"
      :trailing-icon="trailingIcon"
      :to="to"
      :block="block"
      class="rounded-r-none"
      @click="handleMainClick"
    />
    <UPopover
      v-model:open="isOpen"
      mode="click"
      :content="{
        align: 'end',
        side: 'bottom',
      }"
    >
      <UButton
        :disabled="disabled"
        :size="size"
        :color="color"
        variant="outline"
        icon="tabler:chevron-down"
        class="rounded-l-none border-l-0"
        @click="openPopover"
      />

      <template #content>
        <div class="p-2">
          <ul class="space-y-1">
            <li v-for="option in options" :key="option.label">
              <UButton
                class="w-full"
                color="neutral"
                variant="ghost"
                :label="option.label"
                :disabled="disabled"
                @click="handleOptionClick(option.action)"
              />
            </li>
          </ul>
        </div>
      </template>
    </UPopover>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string;
  options: { label: string; action: () => void | Promise<void> }[];
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'ghost' | 'soft';
  color?: 'neutral' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  block?: boolean;
  icon?: string;
  trailingIcon?: string;
  to?: string;
}>(), {
  variant: 'solid',
  color: 'neutral',
  size: 'lg',
});

const isOpen = ref(false);

const emit = defineEmits<{
  (e: 'action'): void;
}>();

const handleMainClick = () => {
  const defaultOption = props.options[0];
  if (defaultOption) {
    emit('action');
    defaultOption.action();
  }
};

const openPopover = () => {
  isOpen.value = true;
};

const handleOptionClick = (action: () => void | Promise<void>) => {
  isOpen.value = false;
  emit('action');
  action();
};

defineExpose({
  isOpen,
});
</script>
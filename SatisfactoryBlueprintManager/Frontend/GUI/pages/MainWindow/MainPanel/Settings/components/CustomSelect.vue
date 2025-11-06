<template>
  <div class="custom-select" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <div
      ref="triggerRef"
      class="select-trigger"
      :style="{ width: width }"
      @click="toggleDropdown"
    >
      <div class="select-value">
        <span v-if="selectedLabel" class="select-text">{{ selectedLabel }}</span>
        <span v-else class="select-placeholder">{{ placeholder }}</span>
      </div>
      <i class="select-icon" :class="{ 'is-reverse': isOpen }">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
          <path fill="currentColor" d="M831.872 340.864 512 652.672 192.128 340.864a30.59 30.59 0 0 0-42.752 0 29.12 29.12 0 0 0 0 41.6L489.664 714.24a32 32 0 0 0 44.672 0l340.288-331.712a29.12 29.12 0 0 0 0-41.728 30.59 30.59 0 0 0-42.752 0z"></path>
        </svg>
      </i>
    </div>

    <!-- 下拉选项 -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="select-dropdown"
      >
        <div class="select-options">
          <div
            v-for="option in options"
            :key="option.value"
            class="select-option"
            :class="{ 'is-selected': option.value === modelValue }"
            @click="selectOption(option)"
          >
            {{ option.label }}
          </div>
          <div v-if="options.length === 0" class="select-empty">
            暂无选项
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface SelectOption {
  label: string
  value: string | number
}

interface Props {
  modelValue: string | number | null
  options: SelectOption[]
  placeholder?: string
  width?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择',
  width: '300px',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
  (e: 'change', value: string | number | null): void
}>()

const isOpen = ref(false)

const selectedLabel = computed(() => {
  if (!props.modelValue) {
    return null
  }
  const option = props.options.find(opt => opt.value === props.modelValue)
  return option?.label || null
})

const toggleDropdown = () => {
  if (props.disabled) {
    return
  }
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const selectOption = (option: SelectOption) => {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  closeDropdown()
}

const dropdownRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

// 点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  if (isOpen.value) {
    const target = event.target as HTMLElement
    const isClickInside = 
      (dropdownRef.value && dropdownRef.value.contains(target)) ||
      (triggerRef.value && triggerRef.value.contains(target))
    
    if (!isClickInside) {
      closeDropdown()
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.custom-select {
  position: relative;
  display: inline-block;

  &.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.select-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 32px;
  background-color: rgba(128, 128, 128, 0.15);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(128, 128, 128, 0.2);
    border-color: rgba(128, 128, 128, 0.3);
  }
}

.custom-select.is-open .select-trigger {
  background-color: rgba(128, 128, 128, 0.25);
  border-color: rgba(128, 128, 128, 0.4);
}

.select-value {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.select-text {
  color: #333;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-placeholder {
  color: rgba(128, 128, 128, 0.6);
  font-size: 14px;
}

.select-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-left: 8px;
  color: rgba(128, 128, 128, 0.8);
  transition: transform 0.2s ease;

  &.is-reverse {
    transform: rotate(180deg);
  }

  svg {
    width: 100%;
    height: 100%;
  }
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  max-height: 200px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(128, 128, 128, 0.3);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-track {
    background-color: rgba(128, 128, 128, 0.1);
    border-radius: 3px;
  }
}

.select-options {
  padding: 4px 0;
}

.select-option {
  padding: 8px 12px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  &.is-selected {
    background-color: rgba(255, 255, 255, 0.3);
    color: white;
  }
}

.select-empty {
  padding: 8px 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

// 下拉动画
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>


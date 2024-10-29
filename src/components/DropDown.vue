<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { usePlayer } from "../player";

interface IProps {
  values: any;
  value: any;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  returnObject?: boolean;
  canSearch?: boolean;
  itemValue?: string;
  itemTitle?: string;
  byIndex?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<IProps>(), {
  canSearch: true,
  itemTitle: "text",
  itemValue: "value"
});

const { activeLang } = usePlayer();

const emits = defineEmits(["change", "update:value"]);

const items = ref<any[]>([]);
const filteredItems = ref<any[]>([]);
const collapse = ref<HTMLDivElement | null>(null);
const inner = ref<HTMLDivElement | null>(null);
const dropDown = ref<HTMLDivElement | null>(null);
const isOpen = ref<boolean>();
const searchValue = ref<string>("");
const cachedSearchValue = ref<string>("");
const loading = ref<boolean>(false);
const isFocused = ref<boolean>(false);

const search = () => {
  if (!isOpen.value) {
    isOpen.value = true;
  }
  filteredItems.value = items.value.filter((item) => String(item?.text).toLowerCase().includes(String(searchValue.value).toLowerCase()));
};

const fieldValue = ref<any>(props.value);

const processItems = () => {
  loading.value = true;
  items.value = [];
  filteredItems.value = [];
  if (props.label) {
    items.value.push({
      value: -1,
      text: props.label
    });
    filteredItems.value.push({
      value: -1,
      text: props.label
    });
  }

  for (let index = 0; index < props.values.length; index++) {
    items.value.push({
      value: props.byIndex ? index : props.values[index][props.itemValue],

      text: props.values[index][props.itemValue]
    });
    filteredItems.value.push({ value: props.byIndex ? index : props.values[index][props.itemValue], text: props.values[index][props.itemValue] });
  }
  const obj = filteredItems.value.find((el) => el.value === fieldValue.value);
  if (obj) {
    searchValue.value = obj?.text;
    cachedSearchValue.value = obj?.text;
  }
};

const onChangeCallback = (item: any, index: number) => {
  if (props.returnObject) {
    fieldValue.value = item;
  } else {
    fieldValue.value = item.value;
  }
  emits("change", fieldValue.value, index);
  isOpen.value = false;
  if (props.returnObject) {
    const obj = filteredItems.value.find((el) => el.value === fieldValue.value.value);
    if (obj) {
      if (obj) {
        searchValue.value = obj?.text;
        cachedSearchValue.value = obj?.text;
      }
    }
    return;
  }
  const obj = filteredItems.value.find((el) => el.value === fieldValue.value);
  if (obj) {
    searchValue.value = obj?.text;
    cachedSearchValue.value = obj?.text;
  }
};

const open = () => {
  if (loading.value) return;

  isOpen.value = !isOpen.value;
};

const clickOutSide = (e: Event) => {
  if (isOpen.value) {
    if (dropDown.value && collapse.value) {
      if (!e.composedPath().includes(dropDown.value)) {
        isOpen.value = false;
        if (filteredItems.value.find((el) => el.value !== +String(searchValue.value))) {
          searchValue.value = cachedSearchValue.value;
          filteredItems.value = items.value;
        }
        if (filteredItems.value.length == 0) {
        }
      }
    }
  }
};

processItems();

watch(
  () => [collapse.value, filteredItems.value],
  (value) => {
    setTimeout(() => {
      loading.value = false;
    }, 1000);

    if (value[1]) {
      setTimeout(() => {
        if (collapse.value && isOpen.value) {
          collapse.value.setAttribute("style", `height: ${inner.value?.offsetHeight}px`);
        }
      }, 0);
    }
  }
);

watch(
  () => props.values,
  () => {
    processItems();
    setTimeout(() => {
      loading.value = false;
    }, 0);
  }
);

watch(
  () => props.value,
  (value) => {
    fieldValue.value = value;
    processItems();

    setTimeout(() => {
      loading.value = false;
    }, 0);
  }
);

onMounted(() => {
  window.addEventListener("click", clickOutSide);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", clickOutSide);
});
</script>

<template>
  <div
    class="dropdown"
    ref="dropDown"
    :class="{
      show: isOpen
    }"
  >
    <div class="dropdown-header">
      <slot name="header" :open="open" :opened="isOpen">
        <div class="dropdown-header__input">
          <input
            :style="{
              cursor: canSearch ? 'default' : 'pointer'
            }"
            :readonly="!canSearch"
            type="text"
            @click="open"
            v-model="searchValue"
            @input="search"
            :disabled="loading || disabled"
            @focus="isFocused = true"
            @blur="isFocused = false"
          />
          <div
            class="input-icon"
            :class="{
              rotate: isOpen
            }"
          >
            <svg data-v-3bdfbb94="" width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                data-v-3bdfbb94=""
                d="M1 1.5L6 6.5L11 1.5"
                stroke="#8A8B8F"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
            </svg>
          </div>
        </div>
      </slot>
      <div class="skeleton-parent" v-if="loading">
        <div class="skeleton">
          <div class="skeleton-light"></div>
        </div>
      </div>
    </div>
    <div
      class="collapse"
      ref="collapse"
      :style="{
        height: isOpen && inner ? `${inner.offsetHeight}px` : 0
      }"
    >
      <div class="collapse-wrapper-inner" ref="inner">
        <slot name="collapse" :open="open" :opened="isOpen" :onChangeCallback="onChangeCallback">
          <template v-if="filteredItems && filteredItems.length"><slot name="prependItem"></slot></template>
          <div
            v-for="(item, index) in filteredItems"
            :key="index"
            :class="['item', { selected: item.value === fieldValue }]"
            :item="item"
            @click="onChangeCallback(item, index)"
          >
            <slot name="item" :item="item" :index="index">
              {{ item.text }}
            </slot>
          </div>

          <template v-if="filteredItems && filteredItems.length"><slot name="appendItem"></slot></template>
          <div class="item" v-if="filteredItems && filteredItems.length === 0">{{ activeLang?.NotFound || "NotFound" }}</div>
        </slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
.dropdown {
  position: relative;
  font-weight: 400;
  font-style: normal;
  display: inline-flex;
  color: rgba(0, 0, 0, 0.87);
  margin: 0 0.3125em;
  display: flex;
  flex: 1;
  width: 100%;

  &-header {
    position: relative;
    width: 100%;
    overflow: hidden;
    border: 0.0625em solid var(--player-divider);
    border-radius: 0.5em;
    padding-right: 0.625em;
    background: var(--player-light-bg);

    .skeleton-parent {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 0.125em;
    }
    .skeleton {
      overflow: hidden;
      width: 100%;
      height: 100%;
      position: relative;
      background-color: rgb(231, 228, 228);
      &-light {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transform: translateX(-100%);
        background-color: rgb(234, 153, 4);
        animation: shimmer 1.5s infinite;
      }
    }

    .selected-item {
      position: absolute;
      top: 50%;
      left: 0.5em;
      transform: translateY(-50%);
    }

    &__input {
      display: flex;
      align-items: center;
      justify-self: center;
      width: 100%;
      height: 100%;
      .input-icon {
        transition: transform 0.3s;
        width: 0.625em;
        height: 0.625em;
        position: relative;

        svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        &.rotate {
          transform: rotate(180deg);
        }
      }
    }
  }

  input {
    margin: 0;
    max-width: 100%;
    outline: 0;
    // -webkit-tap-highlight-color: rgba(255, 255, 255, 0);
    text-align: left;
    line-height: 1.21428571em;
    font-weight: 500;
    // font-family: Lato, "Helvetica Neue", Arial, Helvetica, sans-serif;
    padding: 0.67857143em 0.5em;
    color: rgba(0, 0, 0, 0.87);
    border-radius: 0.28571429em;
    transition: box-shadow 0.1s ease, border-color 0.1s ease;
    box-shadow: none;
    width: 100%;

    &:disabled {
      opacity: 0.5;
      border: none;
    }
  }
  .collapse {
    position: absolute;
    top: calc(100% + 0.625em);
    left: 0;
    background-color: var(--player-light-bg);
    overflow: hidden;
    height: 0;
    transition: all 0.4s ease;
    width: 100%;
    z-index: 99999;
    max-height: 300px;
    overflow-y: auto;
    border-radius: 10px;
    box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);

    &::-webkit-scrollbar {
      width: 0.375em;
    }

    &::-webkit-scrollbar-track {
      background: rgb(238, 238, 238);
    }
    &::-webkit-scrollbar-thumb {
      background: rgb(214, 214, 214);
      border-radius: 0.375em;
    }

    &-wrapper-inner {
      width: 100%;
    }

    :deep().item {
      position: relative;
      cursor: pointer;
      display: block;
      border: none;
      height: auto;
      text-align: left;
      border-top: none;
      line-height: 1em;
      color: rgba(0, 0, 0, 0.87);
      padding: 0.78571429em 1.14285714em !important;
      font-size: 1em;
      text-transform: none;
      font-weight: 400;
      box-shadow: none;
      -webkit-touch-callout: none;
      border-top: 0.0625em solid #fafafa;
      padding: 0.78571429em 1.14285714em !important;
      white-space: normal;
      word-wrap: normal;
      transition: all 0.4s;

      &.selected {
        background: rgba(122, 122, 122, 0.2);
      }

      &:hover {
        background-color: rgba(142, 142, 142, 0.1);
      }
    }
  }
}
</style>

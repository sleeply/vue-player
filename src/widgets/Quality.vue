<script setup lang="ts">
import PlBtn from "../components/PlBtn.vue";
import { IPlayerProvider } from "../types";
import { computed, inject } from "vue";
import { usePlayer } from "../player";
import DropDown from "../components/DropDown.vue";
import { ref } from "vue";
import { onMounted } from "vue";

const emits = defineEmits(["update:settings", "setModalsRef"]);
const videoInject = inject<IPlayerProvider>("videoPlayer");
const { isMobile, activeLang } = usePlayer();

const items = ref();

const data = computed(() => {
  if (items.value && videoInject && videoInject.videoContainer) {
    let height = items.value.offsetHeight;
    if (
      items.value.offsetHeight >
      videoInject.videoContainer.offsetHeight -
        videoInject.videoContainer.offsetHeight / 3
    ) {
      height =
        videoInject.videoContainer.offsetHeight -
        videoInject.videoContainer.offsetHeight / 3;
    }
    items.value.setAttribute("style", `height: ${height}px`);
  }
  return (videoInject && videoInject.params.levels) || [];
});

const setLevel = (item: any) => {
  if (videoInject?.setLevel) {
    videoInject.params.secondaryActiveLevel = item;
  }
};

onMounted(() => {});
</script>

<template>
  <div class="items">
    <div class="settings-items-container" v-if="!isMobile.any()" ref="items">
      <PlBtn
        class="back"
        @click="emits('update:settings', 0), emits('setModalsRef', 0)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style="margin-right: 1.25rem"
          width="1.5rem"
          height="1.5rem"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
          <path d="M15 6l-6 6l6 6"></path>
        </svg>
        {{ activeLang?.Back || "Back" }}
      </PlBtn>
      <div class="divider"></div>
      <PlBtn
        class="item"
        @click="
          videoInject?.setLevel({}, -1),
            emits('update:settings', 0),
            emits('setModalsRef', 0)
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.25rem"
          height="1.25rem"
          style="flex: 0 0 1.25rem; margin-right: 1.25rem"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          :style="{
            opacity: videoInject?.params.activeLevel == -1 ? 1 : 0,
          }"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
          <path d="M5 12l5 5l10 -10"></path>
        </svg>
        <h4>
          {{ activeLang?.auto || "auto" }}
        </h4>
      </PlBtn>
      <PlBtn
        class="item"
        v-for="(item, index) in data"
        @click="
          videoInject?.setLevel(item.height, index),
            emits('update:settings', 0),
            emits('setModalsRef', 0)
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.25rem"
          height="1.25rem"
          style="flex: 0 0 1.25rem; margin-right: 1.25rem"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          :style="{
            opacity: videoInject?.params.activeLevel == index ? 1 : 0,
          }"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
          <path d="M5 12l5 5l10 -10"></path>
        </svg>
        <h4>
          {{ item?.height }}
          <sup>
            {{
              item.height >= 720 && item.height < 1080
                ? "HD" // @ts-ignore
                : item.height >= 1080 && item.height < 1440
                ? // @ts-ignore
                  "FHD"
                : // @ts-ignore
                item.height >= 1440 && item.height < 2160
                ? "QHD"
                : // @ts-ignore
                item.height >= 2160
                ? "UHD"
                : ""
            }}
          </sup>
        </h4>
      </PlBtn>
    </div>

    <div
      class="mobile-items"
      v-if="videoInject && videoInject.params && isMobile.any()"
    >
      <label for="quality"> {{ activeLang?.quality || "quality" }} </label>
      <DropDown
        :item-value="'height'"
        :item-title="'height'"
        :values="data"
        :options="data"
        name="quality"
        id="quality"
        v-model:value="videoInject.params.activeLevel"
        :can-search="false"
        return-object
        by-index
        @change="setLevel"
        :label="activeLang?.auto || 'auto'"
      >
      </DropDown>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.items {
  flex-shrink: 0;
  align-self: flex-start;
  // width: 100%;
}
.mobile-items {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  min-width: 18.75rem;
  flex: 0 0 100%;
  label {
    margin-bottom: 0.625em;
    font-weight: 600;
  }
}
.settings-items-container {
  width: 13.125em;
  display: block;
  transition: all 0.4s ease;
  overflow-y: scroll;
  overflow-x: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
  will-change: scroll-position;

  .divider {
    width: 100%;
    height: 0.0625rem;
    background: var(--player-divider);
  }
  .back {
    padding: 0.625em;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    :deep() .back-ico {
      width: 0.625em;
      height: 0.625em;
    }
  }

  .item {
    padding: 0.9375em 0.625em;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    color: var(--player-light);
    flex: 1;
    width: 100%;
    align-items: center;
    .icon {
      width: 1em;
      height: 1em;
      position: relative;
      margin-right: 1em;
      svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    }
    span {
      font-weight: 700;
    }

    @media screen and (max-width: 1024px) {
      padding: 0.6em 0.625em;
    }
  }
}
</style>

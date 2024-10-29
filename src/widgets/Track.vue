<script setup lang="ts">
import PlBtn from "../components/PlBtn.vue";
import { IPlayerProvider } from "../types";
import { inject } from "vue";
import { computed } from "vue";
import { usePlayer } from "../player";
import DropDown from "../components/DropDown.vue";
import { ref } from "vue";

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
  return (videoInject && videoInject.params.audioTracks) || [];
});

const setTrack = (item: any) => {
  if (videoInject?.setTrack) {
    videoInject.params.secondaryActiveTrack = item;
  }
};
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
        {{ activeLang?.Back || 'Back' }}
      </PlBtn>
      <div class="divider"></div>
      <PlBtn
        class="item"
        v-for="(item, index) in data"
        @click="
          videoInject?.setTrack(index),
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
          {{ item?.name }}
        </h4>
      </PlBtn>
    </div>
    <div
      class="mobile-items"
      v-if="videoInject && videoInject.params && isMobile.any()"
    >
      <label for="quality"> {{ activeLang?.audioTrack || 'audioTrack' }} </label>
      <DropDown
        :item-value="'name'"
        :item-title="'name'"
        :values="data"
        name="track"
        id="track"
        v-model:value="videoInject.params.activeTrack"
        :can-search="false"
        @change="setTrack"
        by-index
      >
      </DropDown>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.items {
  flex-shrink: 0;
  align-self: flex-start;
}
.mobile-items {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  min-width: 18.75rem;
  // flex: 0 0 100%;
  label {
    margin-bottom: 0.625rem;
    font-weight: 600;
  }
}
.settings-items-container {
  width: 13.125em;
  height: 100%;
  transition: all 0.4s ease;
  overflow-y: scroll;
  overflow-x: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
  will-change: scroll-position;
  &::-webkit-scrollbar {
    width: 0.25rem;
  }
  .divider {
    width: 100%;
    height: 0.0625rem;
    background: var(--player-divider);
  }
  .back {
    padding: 0.625em;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    // border-bottom: 0.0625rem solid var(--tollbar-item-hover-bg);
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
      height: 1rem;
      position: relative;
      margin-right: 1rem;
      svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    }
    span {
      font-size: 0.875em;
      font-weight: 700;
      sup {
        font-size: 0.875em;
      }
    }

    @media screen and (max-width: 1024px) {
      padding: 0.6em 0.625em;
    }
  }

  @media screen and (max-width: 1336px) {
    font-size: 14px;
  }
}
</style>

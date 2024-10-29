<script setup lang="ts">
import { inject } from "vue";
import PlBtn from "../components/PlBtn.vue";
import { IPlayerProvider } from "../types";
import { computed } from "vue";
import { usePlayer } from "../player";
const videoInject = inject<IPlayerProvider>("videoPlayer");
const emits = defineEmits(["update:settings", "setModalsRef"]);
const { activeLang } = usePlayer();

const activeLevel = computed(() => (videoInject && videoInject.params.levels[videoInject.params.activeLevel]) || null);
const activeTrack = computed(() => (videoInject && videoInject.params.audioTracks[videoInject.params.activeTrack]) || null);
const activeCaption = computed(
  () => (videoInject && videoInject.params.captions && videoInject.params.captions[videoInject.params.activeCaption || 0]) || null
);
</script>

<template>
  <div class="settings-items-container">
    <PlBtn class="item" @click="emits('update:settings', 1), emits('setModalsRef', 1)">
      <div class="left-collar">
        <div class="icon-size">
          <svg height="24" viewBox="0 0 24 24" width="24">
            <path
              d="M15,17h6v1h-6V17z M11,17H3v1h8v2h1v-2v-1v-2h-1V17z M14,8h1V6V5V3h-1v2H3v1h11V8zM18,5v1h3V5H18z M6,14h1v-2v-1V9H6v2H3v1 h3V14z M10,12h11v-1H10V12z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <h4>
          {{ activeLang?.quality || 'quality' }}
          <span>
            {{ (activeLevel && activeLevel?.height) || (activeLang?.auto || 'auto') }}
            <sup v-if="activeLevel">
              {{
                activeLevel.height >= 720 && activeLevel.height < 1080
                  ? "HD" // @ts-ignore
                  : activeLevel.height >= 1080 && activeLevel.height < 1440
                  ? // @ts-ignore
                    "FHD"
                  : // @ts-ignore
                  activeLevel.height >= 1440 && activeLevel.height < 2160
                  ? "QHD"
                  : // @ts-ignore
                  activeLevel.height >= 2160
                  ? "UHD"
                  : ""
              }}
            </sup>
          </span>
        </h4>
      </div>
    </PlBtn>
    <PlBtn class="item" @click="emits('update:settings', 2), emits('setModalsRef', 2)" v-if="videoInject && videoInject.params.audioTracks.length">
      <div class="left-collar">
        <div class="icon-size">
          <svg height="24" viewBox="0 0 24 24" width="24">
            <path
              d="M15,17h6v1h-6V17z M11,17H3v1h8v2h1v-2v-1v-2h-1V17z M14,8h1V6V5V3h-1v2H3v1h11V8zM18,5v1h3V5H18z M6,14h1v-2v-1V9H6v2H3v1 h3V14z M10,12h11v-1H10V12z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <h4>
          {{ activeLang?.audioTrack || 'audioTrack' }}
          <span>
            {{ (activeTrack && activeTrack?.name) || (activeLang?.auto || 'auto') }}
          </span>
        </h4>
      </div>
    </PlBtn>
    <PlBtn class="item" @click="emits('update:settings', 2), emits('setModalsRef', 3)" v-if="videoInject && videoInject.params.captions?.length">
      <div class="left-collar">
        <div class="icon-size">
          <svg height="24" viewBox="0 0 24 24" width="24">
            <path
              d="M15,17h6v1h-6V17z M11,17H3v1h8v2h1v-2v-1v-2h-1V17z M14,8h1V6V5V3h-1v2H3v1h11V8zM18,5v1h3V5H18z M6,14h1v-2v-1V9H6v2H3v1 h3V14z M10,12h11v-1H10V12z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <h4>
          {{ activeLang?.captions || 'captions' }}
          <span>
            {{ (activeCaption && activeCaption.language) || (activeLang?.off || 'off' )}}
          </span>
        </h4>
      </div>
    </PlBtn>
  </div>
</template>

<style lang="scss" scoped>
.settings-items-container {
  min-width: 20.3125rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-self: flex-end;
  overflow-y: scroll;
  overflow-x: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
  will-change: scroll-position;
  &::-webkit-scrollbar {
    width: 0.25rem;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4375rem 0.625em;
    padding-right: 38px;
    flex: 0 0 100%;
    transition: all 0.4s ease;
    cursor: pointer;
    color: var(--player-light);
    .left-collar,
    .right-collar {
      display: flex;
      align-items: center;
      gap: 0.625em;
    }
    h4 {
      span {
        opacity: 0.5;
      }
    }
  }

  .icon-size {
    width: 1.5em;
    height: 1.5em;
    position: relative;
    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  }
}
</style>

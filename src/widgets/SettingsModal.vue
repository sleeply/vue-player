<script setup lang="ts">
import { reactive, ref } from "vue";
import Quality from "./Quality.vue";
import { onMounted } from "vue";
import SettingsMenu from "./SettingsMenu.vue";
import Track from "./Track.vue";
import { useClickOutside } from "../composables/useClickOutSide";
import { useEventListener } from "../composables/useEventListener";
import Captions from "./Captions.vue";
import { IPlayerProvider } from "../types";
import { inject } from "vue";
import { nextTick } from "vue";

interface IShow {
  settings: number | null;
}
const show: IShow = reactive({
  settings: null
});
const videoInject = inject<IPlayerProvider>("videoPlayer");

const emits = defineEmits<{
  (e: "update:isSettings", value: boolean): void;
}>();
const modalsRef = ref<HTMLDivElement | null>(null);

const setModalsRef = async (value: number) => {
  await nextTick();
  if (modalsRef.value) {
    let activeChild = modalsRef.value.children[value];
    let rect = modalsRef.value.children[value].getBoundingClientRect();

    if (value === 0) {
      modalsRef.value.setAttribute(
        "style",
        `height: ${rect.height}px;
         width: ${rect.width}px;
         transform: translate(-${0}px, 0)
      `
      );
    } else {
      let newRect: DOMRect;
      let ps: number = 0;

      for (let i = 0; i <= modalsRef.value.children.length; i++) {
        if (i < value) {
          newRect = modalsRef.value.children[i].getBoundingClientRect();
          ps += newRect.width;
        }
      }

      await nextTick();
      if (videoInject?.videoContainer && activeChild) {
        let height = rect.height;
        activeChild.setAttribute("style", `--offsetHeight: ${videoInject.videoContainer.offsetHeight}px`)

        if (rect.height > videoInject.videoContainer.offsetHeight) {
          height = videoInject.videoContainer.offsetHeight /2;
        }

        await nextTick();

        modalsRef.value.setAttribute(
          "style",
          `height: ${height}px;
           width: ${rect.width}px;
           transform: translate(-${ps}px, 0)
        `
        );
      }
    }
  }
};

useClickOutside(modalsRef, () => {
  emits("update:isSettings", false);
});

useEventListener(window, "resize", () => {
  emits("update:isSettings", false);
});

onMounted(() => {
  setModalsRef(0);
});
</script>

<template>
  <div class="modals-container">
    <div class="modals" ref="modalsRef">
      <SettingsMenu @setModalsRef="setModalsRef" v-model:settings="show.settings" />
      <Quality @setModalsRef="setModalsRef" v-model:settings="show.settings" />
      <Track @setModalsRef="setModalsRef" v-model:settings="show.settings" />
      <Captions @setModalsRef="setModalsRef" v-model:settings="show.settings" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modals-container {
  position: absolute;
  right: 0%;
  top: -100%;
  transform: translate(0%, -100%);
  overflow: hidden;
  border-radius: 0.5em;
  transition: all 0.4s ease;
  background: var(--player-settings-bg);
  .modals {
    transition: all 0.4s ease;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
  }
}
</style>

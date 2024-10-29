<script setup lang="ts">
import Player from "./Player.vue";
</script>

<template>
  <div class="sContainer">
    <Player
      url="https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8"
      lang="en"
      :langs="{
        en: {
          audioTrack: '',
          auto: '',
          Back: '',
          Cancel: '',
          captions: '',
          NotFound: '',
          off: '',
          quality: '',
          Save: '',
        },
      }"
    />
  </div>
</template>

<style lang="scss">
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
.sContainer {
  width: 100%;
  height: 100%;
  height: 100vh;
}
</style>

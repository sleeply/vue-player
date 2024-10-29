<script setup lang="ts">
import Player from "./Player.vue";
</script>

<template>
  <div class="sContainer">
    <Player
      url="https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8"
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

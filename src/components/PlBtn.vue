<script setup lang="ts"></script>

<template>
  <button type="button">
    <slot></slot>
  </button>
</template>

<style lang="scss" scoped>
button {
  position: relative;
  cursor: pointer;
  color: var(--player-light);
  background: transparent;
  opacity: 0.6;
  transition: all 0.4s;
  border: none;
  outline: none;

  &:active,
  &:hover,
  &:focus {
    opacity: 1;
  }
}
</style>

<template>
  <div
    :style="{
      width: `${1440 * zoom}px`,
      height: '60px',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      position: 'absolute',
      top: '0',
      left: '0',
      willChange: 'transform',
      transform: `translateX(${column.id * 1440 * zoom}px)`,
      backgroundImage: `url(${src})`,
    }"
    class="column"
  ></div>
</template>

<script setup lang="ts">
defineProps<{ zoom: number; column: { id: number }; src: string }>()
</script>

<style>
.column {
  height: 60px;
  box-sizing: border-box;
  border-right: 1px solid grey;
  content-visibility: auto;
}
</style>

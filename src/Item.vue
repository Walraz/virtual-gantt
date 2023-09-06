<template>
  <canvas
    ref="root"
    class="root"
    :style="{
      left: `${item.minX * zoom}px`,
      width: `${(item.maxX - item.minX) * zoom}px`,
      height: '60px',
    }"
  ></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  item: {
    minX: number
    maxX: number
  }
  zoom: number
}>()

const root = ref<HTMLCanvasElement>()

onMounted(() => {
  if (!root.value) return
  const ctx = root.value.getContext('2d')!
  ctx.canvas.width = props.item.maxX - props.item.minX
  ctx.canvas.height = 60
  ctx.fillRect(0, 30, ctx.canvas.width, 3)
})
</script>

<style scoped>
.root {
  position: absolute;
}
.root:hover {
  background: rgba(0, 0, 255, 0.3);
}
</style>

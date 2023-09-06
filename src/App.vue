<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import random from 'lodash.random'
import Worker from './worker/index.ts?worker'

import Column from './Column.vue'
const maxWorkers = navigator.hardwareConcurrency || 4
const worker = Array(maxWorkers)
  .fill(null)
  .map(() => new Worker())
const columns = 30
const columnWidth = 1440
const zoom = ref(1)
const bufferXaxisPixels = columnWidth * 2
const bufferYaxisPixels = 600
let prevMaxX = 40
const data = Array(600)
  .fill(null)
  .map((_, rowId) => {
    prevMaxX = 40
    return {
      id: rowId,
      items: Array(50 * columns)
        .fill(null)
        .map((_, i) => {
          const minX = random(prevMaxX, prevMaxX + 40)
          const width = random(20, 50)
          prevMaxX = minX + width
          return {
            id: `${rowId}-${i}`,
            minX: minX,
            maxX: minX + width,
          }
        }),
    }
  })

const top = ref(0)
const left = ref(0)

const onScroll = (event: Event) => {
  if (!event.target) return
  const { scrollTop, scrollLeft } = event.target as HTMLDivElement
  window.requestAnimationFrame(() => {
    left.value = scrollLeft
    top.value = scrollTop
  })
}

const visibleRows = computed(() => {
  return data.filter((_, i) => {
    const minY = i * 60 - bufferYaxisPixels
    const maxY = i * 60 + 60 + bufferYaxisPixels
    return minY <= top.value + window.innerHeight && top.value <= maxY
  })
})

const days = Array(columns)
  .fill(null)
  .map((_, i) => ({
    id: i,
    minX: i * columnWidth,
    maxX: i * columnWidth + columnWidth,
  }))

const mapItemsByRowDay = () => {
  return data.reduce<{
    [key: string]: {
      [key: string]: { minX: number; maxX: number; id: string }[]
    }
  }>((acc, row) => {
    acc[row.id] = {}
    for (const day of days) {
      acc[row.id][day.id] = row.items.filter((x) => {
        const minX = x.minX
        const maxX = x.maxX
        return minX <= day.id * 1440 + 1440 && day.id * 1440 <= maxX
      })
    }

    return acc
  }, {})
}

const itemsByRowDay = mapItemsByRowDay()

const visibleColumns = computed(() => {
  return days.filter((x) => {
    const minX = x.minX * zoom.value - bufferXaxisPixels * zoom.value
    const maxX = x.maxX * zoom.value + bufferXaxisPixels * zoom.value
    return minX <= left.value + window.innerWidth && left.value <= maxX
  })
})

const blobs = ref<{ [key: string]: { [key: string]: string } }>({})

const pendingGenerate = ref<{ [key: string]: { [key: string]: boolean } }>({})

const generateImage = (
  row_id: number,
  col_id: number,
  items?: {
    minX: number
    maxX: number
    id: string
  }[],
) => {
  if (pendingGenerate.value[row_id]?.[col_id]) return Promise.resolve()
  if (!pendingGenerate.value[row_id]) {
    pendingGenerate.value[row_id] = {}
  }
  pendingGenerate.value[row_id][col_id] = true
  return new Promise((resolve) => {
    setTimeout(() => {
      worker[col_id % worker.length].postMessage({
        zoom: zoom.value,
        row_id,
        col_id,
        items: items || itemsByRowDay[row_id][col_id],
      })

      resolve(null)
    }, 16)
  })
}

watchEffect(async () => {
  for (const row of visibleRows.value) {
    for (const col of visibleColumns.value) {
      await generateImage(row.id, col.id)
    }
  }
})

const onZoom = (e: Event) => {
  const input = e.target as HTMLInputElement
  zoom.value = parseFloat(input.value)
  blobs.value = {}
  pendingGenerate.value = {}
}

const workerOnMessage = (e: MessageEvent) => {
  const payload = e.data as {
    row_id: number
    col_id: number
    url: string
  }
  if (!blobs.value[payload.row_id]) {
    blobs.value[payload.row_id] = {}
  }
  blobs.value[payload.row_id][payload.col_id] = payload.url
}

worker.forEach((x) => {
  x.onmessage = workerOnMessage
})

const updateFirstRow = async () => {
  for (let i = 0; i < 10; i++) {
    for (const day of days) {
      itemsByRowDay[i][day.id] = itemsByRowDay[i][day.id].map((x) => ({
        ...x,
        color: 'blue',
      }))
    }
    pendingGenerate.value[i] = {}
  }
}

const doneImage = computed(() => {
  return Object.values(blobs.value).flatMap((x) => Object.values(x)).length
})
</script>

<template>
  <div class="toolbar">
    <input
      type="range"
      min="0.5"
      max="2"
      step="0.1"
      :value="1"
      @change="(e) => onZoom(e)"
    />
    <button @click="updateFirstRow">Update first</button>
    Generarar column: {{ doneImage }} av
    {{ data.length * days.length }}
  </div>
  <div class="root">
    <div class="scrollContainer" @scroll="onScroll">
      <div
        :style="{
          height: '6000px',
          width: `${columns * columnWidth * zoom}px`,
        }"
      >
        <div
          class="row"
          v-for="row of visibleRows"
          :key="row.id"
          :style="{
            position: 'absolute',
            top: '0',
            left: '0',
            willChange: 'transform',
            width: `${columns * columnWidth * zoom}px`,
            transform: `translateY(${row.id * 60}px)`,
          }"
        >
          <template v-for="column of visibleColumns" :key="column.id">
            <Column
              :zoom="zoom"
              :column="column"
              :src="blobs[row.id]?.[column.id] || ''"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.root {
  background: white;
  position: relative;
  overflow: hidden;
  width: 100vw;
  height: calc(100vh - 30px);
  user-select: none;
}

.toolbar {
  height: 30px;
}

.scrollContainer {
  overflow: auto;
  position: absolute;
  width: 100%;
  height: 100%;
}

.wrapper {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
}

.row {
  height: 60px;
  box-sizing: border-box;
  border-bottom: 1px solid grey;
}
</style>

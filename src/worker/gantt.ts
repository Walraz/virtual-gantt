export const gantt = () => {
  const canvas = new OffscreenCanvas(1, 1)
  const ctx = canvas.getContext('2d')!
  const dpi = 2

  return async (e: MessageEvent) => {
    const paylaod = e.data as {
      zoom: number
      row_id: number
      col_id: number
      items: { id: number; minX: number; maxX: number; color?: string }[]
    }
    ctx.canvas.width = 1440 * paylaod.zoom * dpi
    ctx.canvas.height = 60 * dpi
    ctx.setTransform(
      dpi,
      0,
      0,
      dpi,
      -(paylaod.col_id * 1440 * paylaod.zoom * dpi),
      0,
    )
    ctx.fillText(
      `${paylaod.row_id}-${paylaod.col_id}`,
      paylaod.col_id * 1440 + 10,
      10,
    )
    for (const item of paylaod.items) {
      const minX = item.minX * paylaod.zoom
      const maxX = item.maxX * paylaod.zoom
      const width = maxX - minX
      ctx.fillStyle = item.color || 'black'
      ctx.fillRect(minX, 30, width, 3)
      ctx.fillText(item.id.toString(), minX, 50)
    }
    ctx.setTransform(0, 0, 0, 0, 0, 0)
    canvas.convertToBlob({ quality: 0 }).then((blob) => {
      postMessage({
        row_id: paylaod.row_id,
        col_id: paylaod.col_id,
        url: URL.createObjectURL(blob),
      })
    })
  }
}

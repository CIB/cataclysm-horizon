import * as _ from 'lodash'

import {
  chunkRenderer,
  ChunkRenderer,
  RenderInfo,
} from './renderer/ChunkRenderer'
import { mapFiles } from './loader/MapFiles'
import { chunkCache, ChunkStage } from './ChunkCache'

// The width and height of chunks in multiples of overmap tiles
export let chunkMultiplier = 4
export let chunkRenderRadius = _.ceil(32 / chunkMultiplier)
export let geometryCacheSize = 200
export let cacheEnabled = false

interface Preset {
  chunkMultiplier: number
  chunkRenderRadius: number
  geometryCacheSize: number
}
const presets: { [key: string]: Preset } = {
  tiny: {
    chunkMultiplier: 4,
    chunkRenderRadius: 16 / 4,
    geometryCacheSize: 512,
  },
  small: {
    chunkMultiplier: 4,
    chunkRenderRadius: 32 / 4,
    geometryCacheSize: 1024,
  },
  normal: {
    chunkMultiplier: 4,
    chunkRenderRadius: 64 / 4,
    geometryCacheSize: 2048,
  },
  huge: {
    chunkMultiplier: 8,
    chunkRenderRadius: 96 / 8,
    geometryCacheSize: 512,
  },
  gigantic: {
    chunkMultiplier: 8,
    chunkRenderRadius: 128 / 8,
    geometryCacheSize: 1024,
  },
  unreasonable: {
    chunkMultiplier: 16,
    chunkRenderRadius: 192 / 16,
    geometryCacheSize: 1024,
  },
}

export class BigBrain {
  currentlyUpdating: boolean = false

  /** Load all chunks within a certain radius of the position, and unload all chunks outside of that. */
  async updateChunks(renderer: ChunkRenderer, x: number, y: number) {
    if (this.currentlyUpdating) {
      return
    }
    this.currentlyUpdating = true
    // Submap tiles are 12 x 12, overmap tiles are 2 x 2 submaps,
    // chunks are multiplier x multiplier overmap tiles
    x = _.round(x / (2 * 12 * chunkMultiplier))
    y = _.round(y / (2 * 12 * chunkMultiplier))

    const beginX = x - chunkRenderRadius
    const endX = x + chunkRenderRadius
    const beginY = y - chunkRenderRadius
    const endY = y + chunkRenderRadius

    for (let loadedChunk of _.values(chunkCache.chunks)) {
      if (
        loadedChunk.x < beginX ||
        loadedChunk.x > endX ||
        loadedChunk.y < beginY ||
        loadedChunk.y > endY
      ) {
        await chunkCache.unloadChunk(renderer, loadedChunk)
      }
    }

    for (let x = beginX; x <= endX; x++) {
      for (let y = beginY; y <= endY; y++) {
        chunkCache.loadChunk(renderer, x, y, 158)
      }
    }

    if (cacheEnabled) {
      console.log('cache size', _.size(chunkCache.chunks))
      // Clear cached chunks if there are too many
      let chunksToRemove = _.size(chunkCache.chunks) - geometryCacheSize
      if (chunksToRemove > 0) {
        for (let key of _.keys(chunkCache.chunks)) {
          const chunk = chunkCache.chunks[key]
          if (chunk.stage === ChunkStage.CACHED) {
            delete chunk.cache
            chunk.stage = ChunkStage.UNLOADED
            delete chunkCache.chunks[key]
            chunksToRemove--
          }
          if (chunksToRemove <= 0) break
        }
      }
    }

    this.currentlyUpdating = false
  }

  async load(preset: string, cache: boolean) {
    const chosenPreset = presets[preset]
    chunkMultiplier = chosenPreset.chunkMultiplier
    chunkRenderRadius = chosenPreset.chunkRenderRadius
    geometryCacheSize = chosenPreset.geometryCacheSize
    cacheEnabled = cache

    const { x: startingX, y: startingY } = { x: 80, y: 80 }
    await chunkRenderer.load()
    chunkRenderer.teleport(startingX, startingY)

    chunkRenderer.onTick(async (renderer: ChunkRenderer) => {
      if (this.updateInfo) this.updateInfo(renderer.getInfo())
    })
  }

  public goUp() {
    chunkRenderer.moveZ(+1)
  }

  public goDown() {
    chunkRenderer.moveZ(-1)
  }

  private updateInfo?: (info: RenderInfo) => void

  async onUpdateInfo(callback: (info: RenderInfo) => void) {
    this.updateInfo = callback
  }
}

export const bigBrain = new BigBrain()

import { chunkLoader } from './loader/ChunkLoader'
import {
  ThreeResource,
  buildMesh,
  buildGeometry,
  GeometryData,
} from './renderer/MeshBuilder'
import { ChunkRenderer } from './renderer/ChunkRenderer'
import { chunkMultiplier, cacheEnabled } from './BigBrain'
import { mapFiles } from './loader/MapFiles'
import * as _ from 'lodash'
import { MAP_SYNCHRONIZER, BLOCK_WIDTH } from './game/MapSynchronizer'
import { Vector3 } from 'three'
import { MapBlock } from './game/DfHack'
import { Voxel } from './loader/MapDataLoader'
import { flatten } from 'lodash'

export enum ChunkStage {
  UNLOADED,
  LOADING,
  PROCESSING,
  CACHED,
  MESH,
  RENDERING,
}

function isLoading(stage: ChunkStage) {
  return (
    stage === ChunkStage.LOADING ||
    stage === ChunkStage.PROCESSING ||
    stage === ChunkStage.MESH
  )
}
export interface ChunkRenderData {
  geometry: GeometryData
  texture: string
}

export interface Chunk {
  /** Whether the chunk is currently requested to be rendered. */
  requested: boolean
  /** A chunk with no world data. */
  empty: boolean
  stage: ChunkStage
  /** Keep results of the pre-render stage here. */
  cache?: ChunkRenderData
  /** A reference to the three.js mesh used to represent this chunk. */
  mesh?: THREE.Mesh
  /** A list of all three.js resources that have to be disposed
   *  when unloading this chunk from the renderer. */
  resources: ThreeResource[]
  /**
   * Before unloading a chunk, mark it as stale.
   *
   * Only unload it if it has remained stale for long enough.
   */
  stale?: number

  x: number
  y: number
}

/**
 * Chunks go through various lifecycle stages in the application:
 *
 * 1. Loading, in this stage the chunk has been requested to be rendered,
 *    but data still needs to be loaded from a source (filesystem or similar),
 *    and processed into something usable.
 * 2. Pre-rendering, in this stage the chunk has been pre-processed for rendering,
 *    the voxels and textures have been built, but nothing has been uploaded to the
 *    GPU yet.
 * 3. Rendering, in this stage the geometry, materials and textures have been uploaded
 *    to the GPU and are being displayed on the screen (depending on camera)
 *
 * This class is responsible for managing requests to load / unload chunks to and from
 * the various stages, as well as keeping references to the results.
 */
export class ChunkCache {
  public chunks: { [key: string]: Chunk } = {}

  /**
   * Request a chunk to be rendered. Triggers all the stages unless aborted by
   * a call to unload.
   */
  async loadChunk(
    renderer: ChunkRenderer,
    x: number,
    y: number,
    z: number
  ): Promise<void> {
    let chunk: Chunk = this.chunks[`${x}:${y}:${z}`]
    if (!chunk) {
      chunk = {
        empty: false,
        requested: true,
        stage: ChunkStage.UNLOADED,
        mesh: undefined,
        cache: undefined,
        resources: [],
        x,
        y,
      }
      this.chunks[`${x}:${y}:${z}`] = chunk
    }
    if (chunk.empty) {
      return
    }
    chunk.requested = true
    chunk.stale = undefined

    if (
      chunk.stage === ChunkStage.LOADING ||
      chunk.stage === ChunkStage.PROCESSING ||
      chunk.stage === ChunkStage.MESH ||
      chunk.stage === ChunkStage.RENDERING
    ) {
      return
    }

    if (chunk.stage === ChunkStage.UNLOADED) {
      this.startLoading()
      chunk.stage = ChunkStage.LOADING
      const mapCoordinates = []
      for (let i = 0; i < chunkMultiplier; i++) {
        for (let j = 0; j < chunkMultiplier; j++) {
          mapCoordinates.push({
            x: x * chunkMultiplier + i,
            y: y * chunkMultiplier + j,
          })
        }
      }
      let blocks: MapBlock[] = []
      for (const coordinate of mapCoordinates) {
        const block = MAP_SYNCHRONIZER.getBlock(
          new Vector3(coordinate.x, coordinate.y, z)
        )
        if (block) {
          blocks.push(block)
        }
      }
      if (!blocks.length) {
        this.finishLoading()
        chunk.empty = true
        return
      }
      // const { objects, texture, textureRows } = await chunkLoader.loadVoxels(
      //   submaps
      // )
      // if (!objects.length) {
      //   this.finishLoading()
      //   chunk.empty = true
      //   return
      // }

      console.log('blocks', blocks)
      const objects = flatten(
        blocks.map(block => {
          let x = 0,
            y = 0
          const voxels: Voxel[] = []
          for (let mat of block.baseMaterials) {
            voxels.push({
              cube: true,
              height: 1,
              x: block.mapX + x,
              y: block.mapY + y,
              z: block.mapZ + z,
              textureIndex: MAP_SYNCHRONIZER.getMaterial(mat).tile,
            })

            x++
            if (x >= BLOCK_WIDTH) {
              x = 0
              y++
            }
          }
          return voxels
        })
      )

      console.log('voxels', objects)
      const geometry = buildGeometry(objects, 16)
      chunk.stage = ChunkStage.CACHED
      chunk.cache = {
        texture: undefined as any,
        geometry,
      }
      this.finishLoading()
    }
    if (chunk.requested && chunk.stage === ChunkStage.CACHED) {
      this.startLoading()
      chunk.stage = ChunkStage.PROCESSING
      const { geometry, texture } = chunk.cache!
      if (!cacheEnabled) {
        delete chunk.cache
      }
      console.log('geometry', geometry)
      const [mesh, resources] = await buildMesh(geometry, texture)
      renderer.addMesh(mesh)
      chunk.mesh = mesh
      chunk.resources = resources
      chunk.stage = ChunkStage.RENDERING
      this.finishLoading()
    }
  }

  async unloadChunk(renderer: ChunkRenderer, chunk: Chunk): Promise<void> {
    if (chunk.empty) {
      return
    }

    if (chunk.requested) {
      if (chunk.stage !== ChunkStage.RENDERING) {
        this.finishLoading()
      }
      chunk.requested = false
    }
    const time = new Date().getTime()
    if (!chunk.stale) {
      chunk.stale = new Date().getTime()
      return
    } else if (time - chunk.stale < 1000) {
      return
    }

    if (chunk.stage !== ChunkStage.RENDERING) {
      return
    }

    const mesh = chunk.mesh!
    const resources = chunk.resources
    delete chunk.mesh
    if (cacheEnabled) {
      chunk.stage = ChunkStage.CACHED
    } else {
      chunk.stage = ChunkStage.UNLOADED
    }
    chunk.resources = []
    renderer.removeMesh(mesh)
    for (let resource of resources) {
      resource.dispose()
    }
  }

  // Progress bar management.
  private loadingHandler?: (loading: number, doneLoading: number) => void

  private loading = 0
  private doneLoading = 0

  private startLoading() {
    this.loading++
    if (this.loadingHandler) {
      this.loadingHandler(this.loading, this.doneLoading)
    }
  }

  private finishLoading() {
    this.doneLoading++
    if (this.doneLoading === this.loading) {
      this.doneLoading = 0
      this.loading = 0
    }
    if (this.loadingHandler) {
      this.loadingHandler(this.loading, this.doneLoading)
    }
  }

  public onUpdateLoading(
    handler: (loading: number, doneLoading: number) => void
  ): void {
    this.loadingHandler = handler
  }
}

export const chunkCache = new ChunkCache()

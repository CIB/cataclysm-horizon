import { Vector3 } from 'three'
import { MapBlock, BlockList, MaterialDefinition, MatPair } from './DfHack'
import { keys, pick } from 'lodash'

export const BLOCK_WIDTH = 16
export const BLOCK_DEPTH = 16
export const BLOCK_HEIGHT = 1

export function localToBlock(localPos: Vector3): Vector3 {
  return new Vector3(
    Math.floor(localPos.x / BLOCK_WIDTH),
    Math.floor(localPos.y / BLOCK_DEPTH),
    localPos.z
  )
}

/** Keep a copy of the DF local map. */
export class MapSynchronizer {
  private blocks: { [z: number]: { [position: string]: MapBlock } } = {}
  private materials: { [key: string]: MaterialDefinition } = {}

  private toKey(p: Vector3): string {
    return `${p.x}:${p.y}`
  }

  private toMaterialKey(m: MatPair) {
    return `${m.matType}:${m.matIndex}`
  }

  public setBlock(p: Vector3, block: MapBlock): void {
    if (!this.blocks[p.z]) {
      this.blocks[p.z] = {}
    }
    const amount = keys(this.blocks[p.z]).length
    this.blocks[p.z][this.toKey(p)] = pick(block, [
      'mapX',
      'mapY',
      'mapZ',
      'baseMaterials',
      'constructionItems',
      'materials',
      'layerMaterials',
      'tiles',
      'hidden',
    ])
    if (amount + 1 !== keys(this.blocks[p.z]).length) {
      console.log('no increase after insert', p)
    }
  }

  public getBlock(p: Vector3): MapBlock | null {
    if (!this.blocks[p.z]) {
      return null
    }
    return this.blocks[p.z][this.toKey(p)]
  }

  public addBlockList(blockList: BlockList) {
    for (let block of blockList.mapBlocks) {
      this.setBlock(
        localToBlock(new Vector3(block.mapX, block.mapY, block.mapZ)),
        block
      )
    }
  }

  public addMaterialDefinitions(materialDefinitions: MaterialDefinition[]) {
    for (const mat of materialDefinitions) {
      this.materials[this.toMaterialKey(mat.matPair)] = mat
    }
    console.log('material definitions', this.materials)
  }

  public getMaterial(pair: MatPair): MaterialDefinition {
    return this.materials[this.toMaterialKey(pair)]
  }
}

export const MAP_SYNCHRONIZER = new MapSynchronizer()

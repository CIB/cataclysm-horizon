import * as _ from 'lodash'
import { voxelTileset } from './VoxelTileset'
import { MapBlock, MatPair, MaterialDefinition } from '../game/DfHack'
import {
  MAP_SYNCHRONIZER,
  BLOCK_WIDTH,
  BLOCK_DEPTH,
} from '../game/MapSynchronizer'
import * as THREE from 'three'

export interface Voxel {
  x: number
  y: number
  z: number
  height: number
  tile: number
  color: string
  cube: boolean
}

export interface PreparedVoxel {
  x: number
  y: number
  z: number
  height: number
  textureIndex: number
  cube: boolean
}

function colorFromMaterial(matdef: MaterialDefinition) {
  return matdef.stateColor
    ? `#${new THREE.Color(
        matdef.stateColor.red,
        matdef.stateColor.blue,
        matdef.stateColor.green
      ).getHexString()}`
    : '#000000'
}

function createVoxel(p: THREE.Vector3, tile: number, color: string): Voxel {
  return {
    cube: true,
    height: 1,
    x: p.x,
    y: p.y,
    z: p.z,
    color: color,
    tile: tile,
  }
}

export function loadVoxelsFromBlock(block: MapBlock): Voxel[] {
  let x = 0
  let y = 0
  const voxels: Voxel[] = []
  for (let x = 0; x < BLOCK_WIDTH; x++) {
    for (let y = 0; y < BLOCK_DEPTH; y++) {
      const index = y * BLOCK_WIDTH + x
      if (block.hidden[index]) {
        continue
      }
      const matdef = MAP_SYNCHRONIZER.getMaterial(block.materials[index])
      if (!matdef) {
        continue
      }
      const tile = matdef.tile
      const color = colorFromMaterial(matdef)
      voxels.push(
        createVoxel(
          new THREE.Vector3(block.mapX + x, block.mapY + y, block.mapZ),
          tile,
          color
        )
      )
    }
  }
  return voxels
}

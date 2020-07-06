import * as _ from 'lodash'
import { voxelTileset } from './VoxelTileset'

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

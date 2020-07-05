export interface MapBlock {
  mapX: number
  mapY: number
  mapZ: number

  baseMaterials: MatPair[]
}

export interface BlockList {
  mapBlocks: MapBlock[]
}

export interface MatPair {
  matType: number
  matIndex: number
}

export interface MaterialDefinition {
  id: string
  matPair: MatPair
  name: string
  tile: number
}

export interface TileType {
  caption: string
  direction: string
  id: number
  material: number
  name: string
  shape: number
  special: number
  variant: number
}

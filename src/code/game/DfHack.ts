export interface Material {
    matType: number;
    matIndex: number;
}

export interface MapBlock {
    mapX: number;
    mapY: number;
    mapZ: number;

    baseMaterials: Material[]
}

export interface BlockList {
    mapBlocks: MapBlock[]
}
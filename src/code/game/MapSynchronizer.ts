import { Vector3 } from 'three'
import { MapBlock, BlockList } from './DfHack'

export const BLOCK_WIDTH = 16
export const BLOCK_DEPTH = 16
export const BLOCK_HEIGHT = 1

export function localToBlock(localPos: Vector3): Vector3 {
    return new Vector3(Math.floor(localPos.x / BLOCK_WIDTH), Math.floor(localPos.y / BLOCK_DEPTH), localPos.z);
}

/** Keep a copy of the DF local map. */
export class MapSynchronizer {
    private blocks: {[position: string]: MapBlock} = {};

    private toKey(p: Vector3): string {
        return `${p.x}:${p.y}:${p.z}`
    }

    public setBlock(p: Vector3, block: MapBlock): void {
        this.blocks[this.toKey(p)] = block
    }

    public getBlock(p: Vector3): MapBlock {
        console.log('p', p, this.blocks)
        return this.blocks[this.toKey(p)]
    }

    public addBlockList(blockList: BlockList) {
        for (let block of blockList.mapBlocks) {
            this.setBlock(localToBlock(new Vector3(block.mapX, block.mapY, block.mapZ)), block)
        }
        console.log('blocks', this.blocks)
    }
}

export const MAP_SYNCHRONIZER = new MapSynchronizer()
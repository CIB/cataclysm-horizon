import * as _ from 'lodash'
import { ImageLoader } from 'three'
import {
  joinPaths,
  loadFileAsJSON,
  loadFileAsBase64,
  loadFileAsString,
} from '../util/FileSystem'

export type ImageBuffer = HTMLImageElement
export type SpriteMap = { [key: string]: string }

export class SpriteDrawer {
  private context: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement

  constructor(
    private spritesheet: ImageBuffer,
    private spriteWidth: number,
    private spriteHeight: number
  ) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = spriteWidth
    this.canvas.height = spriteHeight
    this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D
  }

  drawIndex(sprite: number, color: string): void {
    this.context.globalCompositeOperation = 'source-over'
    this.context.fillStyle = 'black'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
    const spritesPerRow = this.spritesheet.width / this.spriteWidth
    const row = _.floor(sprite / spritesPerRow)
    const column = sprite % spritesPerRow
    this.context.drawImage(
      this.spritesheet,
      this.spriteWidth * column,
      this.spriteHeight * row,
      this.spriteWidth,
      this.spriteHeight,
      0,
      0,
      this.spriteWidth,
      this.spriteHeight
    )
    this.context.globalCompositeOperation = 'multiply'
    this.context.fillStyle = color
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  toDataURL(): string {
    return this.canvas.toDataURL()
  }
}

class TilesetEntryLoader {
  private drawer: SpriteDrawer
  constructor(
    spritesheet: ImageBuffer,
    spriteWidth: number,
    spriteHeight: number,
    private beginIndex: number
  ) {
    this.drawer = new SpriteDrawer(spritesheet, spriteWidth, spriteHeight)
  }

  private getSprite(entry: any, key: string): number | null {
    const spriteIndex = entry[key]
    if (_.isArray(spriteIndex)) {
      return null
    }
    return spriteIndex - this.beginIndex
  }

  private updateSpritemap(
    entry: any,
    spriteMap: SpriteMap,
    sprite: string
  ): void {
    const ids = _.isArray(entry.id) ? entry.id : [entry.id]
    for (let id of ids) {
      if (!_.has(spriteMap, id)) {
        spriteMap[id] = sprite
      }
    }
  }

  loadEntry(entry: any, spriteMap: SpriteMap) {
    const bg = this.getSprite(entry, 'bg')
    const fg = this.getSprite(entry, 'fg')

    if (bg === null && fg === null) {
      return
    }

    this.drawer.clear()

    if (bg !== null) {
      this.drawer.drawIndex(bg)
    }
    if (fg !== null) {
      this.drawer.drawIndex(fg)
    }

    this.updateSpritemap(entry, spriteMap, this.drawer.toDataURL())
  }
}

export class TilesetParser {
  public spriteMap: SpriteMap = {}
  public spriteWidth: number = 32
  public spriteHeight: number = 32
  public tilesetName: string = ''
  public tilesetEntries: number = 0
  parseTilesetTxt(txt: string): any {
    return _.fromPairs(
      txt
        .split('\n')
        .map(line => line.split(':'))
        .filter(pair => pair.length >= 2)
        .map(pair => pair.map(item => item.trim()))
    )
  }
  async loadTileset(
    rootDirectory: string,
    onProgress: (progress: number) => void
  ): Promise<void> {
    // First load the tileset definition.
    const tilesetTxt = this.parseTilesetTxt(
      await loadFileAsString(joinPaths(rootDirectory, 'tileset.txt'))
    )
    const tilesetName = (this.tilesetName = tilesetTxt.NAME)
    const tileConfigPath = joinPaths(
      rootDirectory,
      tilesetTxt.JSON || 'tile_config.json'
    )
    const tilesetJSON = await loadFileAsJSON(tileConfigPath)
    this.spriteWidth = tilesetJSON.tile_info[0].width || 32
    this.spriteHeight = tilesetJSON.tile_info[0].height || 32
    const totalEntries = (this.tilesetEntries = _.sum(
      tilesetJSON['tiles-new'].map((item: any) => _.size(item.tiles))
    ))
    let progress = 0

    let baseIndex = 0
    for (let tilesFile of tilesetJSON['tiles-new']) {
      const file = tilesFile.file as string

      if (tilesetName === 'UNDEAD_PEOPLE') {
        const beginPng = {
          '1_tiles_32x32_0-5199.png': 0,
          '9_tiles-connected_32x32_16852-22051.png': 16852,
          '14_tiles2_32x32_22365-27564.png': 22365,
        }
        baseIndex = (beginPng as any)[file]
        if (!_.isNumber(baseIndex)) {
          progress += _.size(tilesFile.tiles)
          if (onProgress) onProgress(progress / totalEntries)
          continue
        }

        // Tileset loader is still buggy, correct some stuff
        const grass = tilesFile.tiles.find((item: any) => item.id === 't_grass')
        if (grass) grass.fg = 3075
        const grassDead = tilesFile.tiles.find(
          (item: any) => item.id && item.id[0] === 't_grass_dead'
        )
        if (grassDead) grassDead.fg = 17236
      }
      const imageData = await loadFileAsBase64(joinPaths(rootDirectory, file))

      const image = (await new Promise((resolve, reject) => {
        const imageElement = new Image()
        imageElement.src = `data:image/png;base64,${imageData}`
        imageElement.onload = () => resolve(imageElement)
        imageElement.onerror = reject
      })) as HTMLImageElement

      progress = await tilesetParser.loadTilesetForFile(
        tilesFile.tiles,
        image,
        baseIndex,
        this.spriteMap,
        totalEntries,
        progress,
        onProgress
      )
    }
  }

  async loadTilesetForFile(
    entries: any[],
    spritesheet: ImageBuffer,
    beginIndex: number,
    spriteMap: SpriteMap,
    totalEntries: number,
    progress: number,
    onProgress: (progress: number) => void
  ): Promise<number> {
    const tilesetEntryLoader = new TilesetEntryLoader(
      spritesheet,
      this.spriteWidth,
      this.spriteHeight,
      beginIndex
    )
    for (let entry of entries) {
      tilesetEntryLoader.loadEntry(entry, spriteMap)
      progress++
      if (progress % 50 === 0) {
        if (onProgress) onProgress(progress / totalEntries)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    return progress
  }
}

export const tilesetParser = new TilesetParser()

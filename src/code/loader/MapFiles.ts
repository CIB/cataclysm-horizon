import { pick, values, last } from 'lodash'
import { loadFileAsJSON } from '../util/FileSystem'
import * as _ from 'lodash'
import path from 'path'

/**
 * Class to abstract away access to .map JSON files.
 *
 * The files could in theory be uploaded using a file <input>, extracted from a .zip
 * archive, loaded directly from disk (electron), or even be streamed from a different
 * application.
 */
export class MapFiles {
  private files: { [key: string]: string[] } = {}

  async loadSubmaps(overmapX: number, overmapY: number): Promise<any[]> {
    const relevantFiles = this.files[`${overmapX}:${overmapY}`]
    if (!relevantFiles) return []
    let submaps: any[] = []
    for (let file of relevantFiles) {
      const loadedSubmaps = await loadFileAsJSON(file)
      submaps = submaps.concat(
        loadedSubmaps.map((submap: any) =>
          pick(submap, ['coordinates', 'terrain'])
        )
      )
    }
    return submaps
  }

  async getStartingPosition(): Promise<{ x: number; y: number }> {
    const randomFile = await loadFileAsJSON(values(this.files)[0][0])
    return {
      x: randomFile[0].coordinates[0] * 12,
      y: randomFile[0].coordinates[1] * 12,
    }
  }

  async uploadFiles(files: string[]) {
    for (let file of files) {
      const coordinates = path.basename(file, '.map').split('.')
      const key = `${coordinates[0]}:${coordinates[1]}`
      if (this.files[key]) {
        this.files[key].push(file)
      } else {
        this.files[key] = [file]
      }
    }
  }

  getFilesCount(): number {
    return _.size(this.files)
  }
}

export const mapFiles = new MapFiles()

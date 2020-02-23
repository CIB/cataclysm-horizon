// Abstraction for file-system operations. Right now only supports
// electron, later should support other methods as well.

import fs from 'fs'
import path from 'path'
import { remote } from 'electron'
import * as _ from 'lodash'

export function joinPaths(base: string, extension: string) {
  return path.join(base, extension)
}

export async function selectDirectories(): Promise<string[] | undefined> {
  const rootDirectories = await new Promise<string[]>(resolve =>
    remote.dialog.showOpenDialog(
      {
        properties: ['openDirectory'],
        message:
          'Select the directory containing your map data. Typically of the form save/<world>/map',
      },
      resolve
    )
  )

  if (!rootDirectories) {
    return
  }

  return rootDirectories
}

export async function selectDirectory(): Promise<string> {
  return (await selectDirectories())![0]
}

export async function loadFileAsJSON(file: string): Promise<any> {
  return JSON.parse(await loadFileAsString(file))
}

export async function loadFileAsBase64(file: string): Promise<any> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(file, 'base64', (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

export async function loadFileAsString(file: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(file, 'utf-8', (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

export async function getFilesInDirectory(
  rootDirectory: string
): Promise<string[]> {
  const walk = async (dir: string): Promise<string[]> => {
    const files = await new Promise<string[]>((resolve, reject) =>
      fs.readdir(dir, async (err, files) => {
        if (err) reject(err)
        resolve(files)
      })
    )
    let filelist: string[] = []
    for (let file of files) {
      filelist = filelist.concat(
        fs.statSync(path.join(dir, file)).isDirectory()
          ? await walk(path.join(dir, file))
          : [path.join(dir, file)]
      )
    }
    return filelist
  }

  return walk(rootDirectory)
}

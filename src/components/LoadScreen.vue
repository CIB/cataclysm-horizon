<template>
  <div class="container">
    <div class="tile">
      <h3>Welcome to Cataclysm: Horizon, survivor!</h3>
      <span>To get started, import a tileset and a world save.</span>
      <span class="start-button-row">
        <button
          @click="$emit('start', preset, cache)"
          :disabled="!tilesetLoaded || mapFilesLoaded <= 0"
          class="start-button"
        >Start</button>
        <select
          class="preset-select"
          v-model="preset"
          title="Select how much of the map is displayed at once."
        >
          <option value="tiny">Tiny</option>
          <option value="small">Small</option>
          <option value="normal">Normal</option>
          <option value="huge">Huge</option>
          <option value="gigantic">Gigantic</option>
          <option value="unreasonable">Unreasonable</option>
        </select>
        <label
          class="cache-label"
          title="Keeps part of the map in memory, even when not currently rendered. Significantly increases memory usage."
        >Cache</label>
        <input
          class="cache-checkbox"
          type="checkbox"
          v-model="cache"
          title="Keeps part of the map in memory, even when not currently rendered. Significantly increases memory usage."
        />
      </span>
      <span class="space"></span>
      <span>Controls:</span>
      <span>
        <b>F11</b> to toggle fullscreen
      </span>
      <span>Left mouse button to rotate the view</span>
      <span>Arrow keys or right mouse button to move</span>
      <span>
        <b>f</b> to toggle the rendering info
      </span>
    </div>
    <div class="tile">
      <span class="import-row">
        <button @click="importTileset" :disabled="tilesetLoading">Import Tileset</button>
        <progress class="progressbar" :value="tilesetProgress" max="100"></progress>
      </span>
      <template v-if="!tilesetLoading">
        <span>Select the root directory of a tileset.</span>
        <div class="info">Usually located under Cataclysm/gfx/Tileset</div>
      </template>
      <template v-else>
        <span>Tileset: {{tilesetName}}</span>
        <span>Entries: {{tilesetEntries}}</span>
      </template>
    </div>

    <div class="tile">
      <span class="import-row">
        <button @click="importMapData" :disabled="mapDataLoading">Import Map Files</button>
        <progress class="progressbar" :value="mapDataProgress" max="100"></progress>
      </span>
      <template v-if="mapDataProgress === 0">
        <span>Select the root directory of your map files.</span>
        <div class="info">Usually located under Cataclysm/save/World/maps</div>
      </template>
      <template v-else>
        <span>Map Files: {{mapFilesLoaded}}</span>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { chunkRenderer } from './../code/renderer/ChunkRenderer'

import { tilesetParser } from '../code/loader/TilesetParser'
import { mapFiles } from '../code/loader/MapFiles'
import { bigBrain } from '../code/BigBrain'
import { chunkCache } from '../code/ChunkCache'
import { RenderInfo } from '../code/renderer/ChunkRenderer'
import {
  selectDirectory,
  selectDirectories,
  getFilesInDirectory,
} from '../code/util/FileSystem'
import * as _ from 'lodash'

@Component
export default class LoadScreen extends Vue {
  private tilesetProgress: number = 0
  private tilesetLoaded: boolean = false
  private tilesetLoading: boolean = false
  private tilesetName: string = ''
  private tilesetEntries: number = 0

  private mapDataLoading: boolean = false
  private mapFilesLoaded: number = 0

  private preset: string = 'tiny'
  private cache: boolean = false

  get mapDataProgress() {
    if (this.mapFilesLoaded) {
      return 100
    } else if (this.mapDataLoading) {
      return 10
    } else {
      return 0
    }
  }

  async importTileset() {
    const tilesetDirectory = await selectDirectory()
    if (!tilesetDirectory) return
    this.tilesetLoading = true
    await tilesetParser.loadTileset(tilesetDirectory, progress => {
      this.tilesetProgress = _.round(100 * progress)
      this.tilesetName = tilesetParser.tilesetName
      this.tilesetEntries = tilesetParser.tilesetEntries
    })
    this.tilesetLoaded = true
  }

  async importMapData() {
    const mapDirectories = await selectDirectories()
    this.mapDataLoading = true
    const files = _.flatten(
      await Promise.all(mapDirectories!.map(getFilesInDirectory))
    )
    this.mapDataLoading = false
    if (!files) return
    await mapFiles.uploadFiles(files)
    this.mapFilesLoaded = mapFiles.getFilesCount()
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.tile {
  margin: 8px;
  padding: 8px;
  width: 380px;
  height: 200px;
  color: white;
  background-color: rgb(68, 66, 73);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
  text-align: start;
}

h3 {
  margin-top: 0px;
  margin-bottom: 8px;
}

.space {
  flex-grow: 1;
}

.import-row {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
}

.progressbar {
  flex-grow: 1;
  height: 20px;
  margin-left: 8px;
  opacity: 0.8;
}

.info {
  font-size: smaller;
  color: rgb(194, 194, 194);
}

.start-button {
  padding-left: 8px;
  padding-right: 8px;
  font-size: x-large;
  margin-top: 8px;
}
button:disabled {
  opacity: 0.5;
}

button {
  border-radius: 2px;
  font-size: larger;
  color: white;
  background-color: rgb(54, 53, 58);
  border-color: rgb(182, 182, 182);
}

.preset-select {
  margin-left: 16px;
  border-radius: 2px;
  font-size: larger;
  color: white;
  background-color: rgb(54, 53, 58);
  border-color: rgb(182, 182, 182);
}

.start-button-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.cache-label {
  margin-left: 16px;
  margin-right: 4px;
  font-size: larger;
}

.cache-checkbox {
  width: 20px;
  height: 20px;
  color: white;
  background-color: rgb(54, 53, 58);
  border-color: rgb(182, 182, 182);
}
</style>

<template>
  <div id="app" v-on:keyup.f="toggleUI" v-on:keyup.page-up="goUp" v-on:keyup.page-down="goDown">
    <div id="top-overlay" v-if="!showFileLoader && showUI">
      <div v-if="minimizeUI" @click="toggleMinimizeUI" class="maximize-ui-button">+</div>
      <div v-if="!minimizeUI" class="top-overlay-expanded">
        <div class="top-line">
          <div class="legend">
            <div>
              Keyboard
              <b>f</b> to show/hide,
              <b>F11</b> to toggle fullscreen
            </div>
            <div>Arrow keys to move, left mouse button to rotate</div>
          </div>
          <div class="space-between"></div>
          <div class="minimize-ui-button" @click="toggleMinimizeUI">
            <div>-</div>
          </div>
        </div>
        <table>
          <tr>
            <td align="left">Triangles:</td>
            <td align="right">{{triangles}}</td>
          </tr>
          <tr>
            <td align="left">FPS:</td>
            <td align="right">{{fps}}</td>
          </tr>
        </table>
        <span class="space-between"></span>
        <progress
          v-show="progressMax > 0 && progressCurrent < progressMax"
          id="progressbar"
          :value="progressCurrent"
          :max="progressMax"
        >32</progress>
      </div>
    </div>

    <LoadScreen v-if="showFileLoader" @start="startRendering"></LoadScreen>
    <Renderer v-else />
  </div>
</template>

<script lang="ts">
import LoadScreen from './components/LoadScreen.vue'
import Renderer from './components/Renderer.vue'

import { Component, Vue } from 'vue-property-decorator'
import { tilesetParser } from './code/loader/TilesetParser'
import { mapFiles } from './code/loader/MapFiles'
import { bigBrain } from './code/BigBrain'
import { chunkCache } from './code/ChunkCache'
import { RenderInfo } from './code/renderer/ChunkRenderer'
import {
  selectDirectory,
  selectDirectories,
  getFilesInDirectory,
} from './code/util/FileSystem'
import * as _ from 'lodash'

@Component({
  components: {
    Renderer,
    LoadScreen,
  },
})
export default class App extends Vue {
  private showFileLoader = false
  private showUI = true
  private minimizeUI = false
  private file: string = ''
  private progressCurrent = 32
  private progressMax = 100
  private fps: number = 0
  private triangles: number = 0
  private dataReady: boolean = false

  mounted() {
    this.startRendering('normal', false)
  }

  async startRendering(preset: string, cache: boolean) {
    chunkCache.onUpdateLoading((loading: number, doneLoading: number) => {
      this.progressCurrent = doneLoading
      this.progressMax = loading
    })
    bigBrain.load(preset, cache)
    bigBrain.onUpdateInfo((renderInfo: RenderInfo) => {
      this.fps = Math.round(1000 / renderInfo.frameDuration)
      this.triangles = renderInfo.triangles
    })
    this.showFileLoader = false
  }

  goUp() {
    bigBrain.goUp()
  }

  goDown() {
    bigBrain.goDown()
  }

  toggleUI() {
    this.showUI = !this.showUI
  }
  toggleMinimizeUI() {
    this.minimizeUI = !this.minimizeUI
  }
}
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  position: relative;
  min-height: 100%;
}
.load-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
}
#top-overlay {
  position: absolute;
  top: 5px;
  left: 5px;
  opacity: 0.7;
  color: white;
  font-size: larger;
}

.top-line {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: space-between;
}

.top-overlay-expanded {
  width: 400px;
  height: 140px;

  border-radius: 8px 8px 16px 8px;
  padding: 8px;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: black;
}

.minimize-ui-button {
  font-size: 28px;
  padding-bottom: 4px;
  line-height: 16px;
  width: 20px;
  background-color: rgb(84, 77, 105);
  align-self: start;
  border-radius: 6px;
  cursor: pointer;
}

.maximize-ui-button {
  font-size: 24px;
  line-height: 24px;
  width: 24px;
  background-color: rgb(84, 77, 105);
  align-self: center;
  border-radius: 8px;
  cursor: pointer;
}

.space-between {
  flex-grow: 1;
}

.legend {
  font-size: smaller;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: start;
}

#progressbar {
  width: 100%;
  height: 20px;
  justify-self: end;
}

progress::-webkit-progress-bar {
  background-color: rgb(9, 8, 10);
  width: 100%;
}
progress {
  background-color: #000;
}
progress::-webkit-progress-value {
  background-color: rgb(132, 120, 168) !important;
}
progress::-moz-progress-bar {
  background-color: #aaa !important;
}

body {
  height: 100vh;
  margin: 0px;
  padding: 0px;
  color: white;
  background-color: rgb(59, 57, 63);
}
</style>

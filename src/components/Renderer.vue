<template>
  <canvas id="rendererCanvas"></canvas>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { mainRenderer } from './../code/renderer/MainRenderer'

@Component
export default class Renderer extends Vue {
  @Prop() private msg!: string

  mounted() {
    const canvas = document.querySelector(
      '#rendererCanvas'
    ) as HTMLCanvasElement
    mainRenderer.load(canvas)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
#rendererCanvas {
  width: 99.8vw;
  height: 99.5vh;
}
</style>

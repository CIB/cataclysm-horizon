import { createConnection } from 'net'
import { chunkCache } from '../ChunkCache'
import { mainRenderer } from '../renderer/MainRenderer'
import { bigBrain } from '../BigBrain'
import { liveRenderer } from '../renderer/LiveRenderer'

export interface TileMessage {
    position: [number, number, number]
    visible: boolean
    terrain: number
}

const client = createConnection(8091)
client.on('connect', () => {
    console.log('successfully connected to game instance')
})

let storedBuffer = '';
client.on('data', async data => {
    storedBuffer += data;
    const messages = storedBuffer.split('|||||')
    storedBuffer = messages.pop()!
    for (let message of messages) {
        console.log('message', message)
        const json = JSON.parse(message);
        if (json.type === 'set_center_position') {
            console.log('position', json.position)
            mainRenderer.teleport(json.position[0], json.position[1])
        } else if (json.type === 'map_diff') {
            await liveRenderer.addTiles(json.diff)
        }
    }
})
client.on('error', error => {
    console.log('error', error)
})
import { createConnection } from 'net'
import { Struct } from 'struct'

export interface TileMessage {
    position: [number, number, number]
    visible: boolean
    terrain: number
}

const client = createConnection(8091)
client.on('connect', () => {
    console.log('successfully connected to game instance')
    const header = HeaderStruct.allocate()
    const message = JSON.stringify({'type': 'get_overmap_tile'})
    header.fields.length = message.length
    client.write(header.buffer())
    client.write(message)
    listenerLoop();
})


function chunkString(str: string, len: number) {
    const size = Math.ceil(str.length / len)
    const r = Array(size)
    let offset = 0

    for (let i = 0; i < size; i++) {
        r[i] = str.substr(offset, len)
        offset += len
    }

    return r
}


let buffer = new Buffer('', 'hex')
let connected = true
const readData = async (bytes: number): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        if (buffer.length >= bytes) {
            const retVal = buffer.slice(0, bytes)
            buffer = buffer.slice(bytes)
            return resolve(retVal)
        }

        const errorListener = (err: Error) => {
            client.removeListener('data', listener)
            client.removeListener('data', errorListener)
            reject(err)
        }
        const listener = (data: Buffer) => {
            buffer = Buffer.concat([buffer, data])

            if (buffer.length >= bytes) {
                client.removeListener('data', listener)
                client.removeListener('data', errorListener)
                const retVal = buffer.slice(0, bytes)
                buffer = buffer.slice(bytes)
                return resolve(retVal)
            }
        }
        client.on('data', listener)
        client.on('error', errorListener)
    })
}


const HeaderStruct = new Struct<{
    length: number
}>()
    .word32Ule('length')

const listenerLoop = async () => {
    while (connected) {
        const header = HeaderStruct.allocate()
        header.setBuffer(await readData(header.buffer().length))
        console.log('header', header.fields)
        const data = await readData(header.fields.length)
        // console.log('data', data.toString('utf8'))
        const json = JSON.parse(data.toString('utf8'))
        console.log('message!', json)
    }
}
import { createConnection } from 'net'
import { Struct } from 'struct'
import { load, Root, Message, Type } from 'protobufjs'
import { MAP_SYNCHRONIZER } from './MapSynchronizer'
import { BlockList } from './DfHack'
import { chunkCache } from '../ChunkCache'
import { chunkRenderer } from '../renderer/ChunkRenderer'
import { BoxBufferGeometry, MeshBasicMaterial, Mesh } from 'three'

const WordStruct = new Struct<{ value: number }>().word16Sle('value')

const HeaderStruct = new Struct<{
  magic: string
  version: number
  REQUEST_MAGIC: string
  RESPONSE_MAGIC: string
}>()
  .chars('magic', 8)
  .word32Sle('version')

const RPCMessageHeaderStruct = new Struct<{ id: number; size: number }>()
  .word16Sle('id')
  .chars('padding', 2)
  .word32Sle('size')

console.log('nice')
const client = createConnection(5000)
client.on('connect', () => {
  console.log('we are connected to DFHack!')

  HeaderStruct.allocate()
  HeaderStruct.set('magic', 'DFHack?\n')
  HeaderStruct.set('version', 1)
  const buf = HeaderStruct.buffer()
  client.write(buf)
})

let buffer = new Buffer('', 'hex')

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
      console.log('data', chunkString(data.toString('hex'), 4))
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

let main = async () => {
  const handshakeLength = HeaderStruct.allocate().buffer().length
  console.log('handshakelength', handshakeLength)
  const buffer = await readData(handshakeLength)
  HeaderStruct.setBuffer(buffer)
  console.log('got', HeaderStruct.get('version'))

  const messageHeader = RPCMessageHeaderStruct.allocate()
  const coreProtocol = await new Promise<Root>((resolve, reject) =>
    load('./dfhack/library/proto/CoreProtocol.proto', (err, root) => {
      if (err) reject(err)
      else resolve(root)
    })
  )
  const remoteFortressReader = await new Promise<Root>((resolve, reject) =>
    load('./dfhack/plugins/proto/RemoteFortressReader.proto', (err, root) => {
      if (err) reject(err)
      else resolve(root)
    })
  )

  const CoreBindRequest = coreProtocol.lookupType('CoreBindRequest')
  const CoreBindReply = coreProtocol.lookupType('CoreBindReply')
  const EmptyMessage = coreProtocol.lookupType('EmptyMessage')
  const StringMessage = coreProtocol.lookupType('StringMessage')
  const MaterialList = remoteFortressReader.lookupType('MaterialList')
  const BlockRequest = remoteFortressReader.lookupType('BlockRequest')
  const BlockList = remoteFortressReader.lookupType('BlockList')

  interface RPCDefinition {
    assignedId: number | undefined
    method: string
    plugin: string | null
    input: Type
    output: Type
  }
  const rpcTable: { [rpcName: string]: RPCDefinition } = {
    RegisterRPC: {
      assignedId: 0,
      method: 'RegisterRPC',
      plugin: null,
      input: CoreBindRequest,
      output: CoreBindReply,
    },
  }

  async function callRPC<R, T>(method: string, request: R): Promise<T> {
    const req = request !== undefined ? request : {}
    const inType = rpcTable[method].input
    const outType = rpcTable[method].output
    const id = rpcTable[method].assignedId
    const errMsg = inType.verify(req)
    if (errMsg) {
      throw Error(errMsg)
    }
    const requestProto = inType.create(req)
    const requestBuf = inType.encode(requestProto).finish()
    messageHeader.set('id', id)
    messageHeader.set('size', requestBuf.length)
    console.log('length', requestBuf.length)
    client.write(messageHeader.buffer())
    client.write(requestBuf)

    let replyHeader = await readData(
      RPCMessageHeaderStruct.allocate().buffer().length
    )
    console.log('header', replyHeader.toString('ascii'))
    let replyHeaderStruct = RPCMessageHeaderStruct
    replyHeaderStruct.setBuffer(replyHeader)
    console.log('id', replyHeaderStruct.get('id'))
    console.log('got size', replyHeaderStruct.fields.size)

    return outType.decode(await readData(replyHeaderStruct.fields.size)) as any
  }

  async function registerRPC(
    method: string,
    plugin: string | null,
    input: Type,
    output: Type
  ) {
    const reply = await callRPC<
      {
        method: string
        plugin: string | null
        inputMsg: string
        outputMsg: string
      },
      { assignedId: number }
    >('RegisterRPC', {
      method,
      plugin,
      inputMsg: input.fullName.substr(1),
      outputMsg: output.fullName.substr(1),
    })
    console.log('reply', reply)

    rpcTable[method] = {
      assignedId: reply.assignedId,
      method,
      plugin,
      input,
      output,
    }
  }

  console.log('empty message', EmptyMessage.fullName.substr(1))

  await registerRPC('GetDFVersion', null, EmptyMessage, StringMessage)
  await registerRPC(
    'GetBlockList',
    'RemoteFortressReader',
    BlockRequest,
    BlockList
  )
  await registerRPC(
    'ResetMapHashes',
    'RemoteFortressReader',
    EmptyMessage,
    EmptyMessage
  )

  const dfVersion = await callRPC<void, { value: string }>(
    'GetDFVersion',
    undefined
  )
  console.log('dfVersion', dfVersion.value)
  const blockRequest = {
    blocksNeeded: 100,
    minX: 5,
    maxX: 6,
    minY: 5,
    maxY: 6,
    minZ: 158,
    maxZ: 159,
  }
  const resetHashReply = await callRPC<void, void>('ResetMapHashes', undefined)
  console.log('reset hash', resetHashReply)
  const blockReply = await callRPC('GetBlockList', blockRequest)
  MAP_SYNCHRONIZER.addBlockList(blockReply as BlockList)
  console.log('block reply', blockReply)

  chunkCache.loadChunk(chunkRenderer, 1, 1, 158)

  const geometry = new BoxBufferGeometry(1, 1, 1)
  const material = new MeshBasicMaterial({ color: 0xffff00 })
  const mesh = new Mesh(geometry, material)
  mesh.position.x = 80
  mesh.position.y = -80
  mesh.position.z = 317

  chunkRenderer.addMesh(mesh)
}

main()

import { createServer, AddressInfo } from 'net'
import { getMemo, setMemo } from 'fs-memo'

export interface GetPortOptions {
  name: string
  random: boolean
  port: number
  ports: number[]
  host: string
  memoDir: string
  memoName: string
}

export type GetPortInput = Partial<GetPortOptions> | number | string

export async function getPort (config?: GetPortInput): Promise<number> {
  if (typeof config === 'number' || typeof config === 'string') {
    config = { port: parseInt(config + '') }
  }

  const options = {
    name: 'default',
    random: false,
    port: parseInt(process.env.PORT || '') || 3000,
    ports: [4000, 5000, 6000, 7000],
    host: process.env.HOST || '0.0.0.0',
    memoName: 'port',
    ...config
  } as GetPortOptions

  const portsToCheck: number[] = []

  if (!options.random) {
    // options.port
    if (options.port) {
      portsToCheck.push(options.port)
    }

    // options.ports
    if (Array.isArray(options.ports)) {
      portsToCheck.push(...options.ports)
    }
  }

  // Memo
  const memoOptions = { name: options.memoName, dir: options.memoDir! }

  const memoKey = 'port_' + options.name
  const memo = await getMemo(memoOptions)
  if (memo[memoKey]) {
    portsToCheck.push(memo[memoKey])
  }

  const availablePort = await checkPorts(portsToCheck, options.host)

  // Persist
  await setMemo({ [memoKey]: availablePort }, memoOptions)

  return availablePort
}

export async function checkPorts (ports: number[], host?: string): Promise<number> {
  for (const port of ports) {
    const r = await checkPort(port, host)
    if (r) {
      return r
    }
  }
  return checkPort(0, host) as unknown as number
}

export function checkPort (port: number, host: string = process.env.HOST || '0.0.0.0'): Promise<number|false> {
  return new Promise((resolve) => {
    const server = createServer()
    server.unref()
    server.on('error', () => { resolve(false) })
    server.listen(port, host, () => {
      const { port } = server.address() as AddressInfo
      server.close(() => { resolve(port) })
    })
  })
}

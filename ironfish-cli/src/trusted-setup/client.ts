/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Assert, ErrorUtils, Event, Logger } from '@ironfish/sdk'
import net from 'net'
import { CeremonyClientMessage, CeremonyServerMessage } from './schema'

export class CeremonyClient {
  readonly socket: net.Socket
  readonly host: string
  readonly port: number
  readonly logger: Logger

  private stopPromise: Promise<{ success: boolean }> | null = null
  private stopResolve: ((params: { success: boolean }) => void) | null = null

  readonly onJoined = new Event<[{ queueLocation: number }]>()
  readonly onInitiateUpload = new Event<[{ uploadLink: string }]>()
  readonly onInitiateContribution = new Event<
    [{ downloadLink: string; contributionNumber: number }]
  >()
  readonly onContributionVerified = new Event<
    [{ hash: string; downloadLink: string; contributionNumber: number }]
  >()

  constructor(options: { host: string; port: number; logger: Logger }) {
    this.host = options.host
    this.port = options.port
    this.logger = options.logger

    this.socket = new net.Socket()
    this.socket.on('data', (data) => void this.onData(data))
  }

  async start(): Promise<boolean> {
    this.stopPromise = new Promise((r) => (this.stopResolve = r))

    const connected = await connectSocket(this.socket, this.host, this.port)
      .then(() => true)
      .catch(() => false)

    if (connected) {
      this.socket.on('error', this.onError)
      this.socket.on('close', this.onDisconnect)
    }

    return connected
  }

  stop(success: boolean): void {
    this.socket.end()
    this.stopResolve && this.stopResolve({ success })
    this.stopPromise = null
    this.stopResolve = null
  }

  waitForStop(): Promise<{ success: boolean }> {
    Assert.isNotNull(this.stopPromise, 'Cannot wait for stop before starting')
    return this.stopPromise
  }

  contributionComplete(): void {
    this.send({ method: 'contribution-complete' })
  }

  uploadComplete(): void {
    this.send({ method: 'upload-complete' })
  }

  private send(message: CeremonyClientMessage): void {
    this.socket.write(JSON.stringify(message) + '\n')
  }

  private onDisconnect = (): void => {
    this.stop(false)
    this.socket.off('error', this.onError)
    this.socket.off('close', this.onDisconnect)
  }

  private onError = (error: unknown): void => {
    this.logger.error(`Server error ${ErrorUtils.renderError(error)}`)
  }

  private onData(data: Buffer): void {
    const message = data.toString('utf-8')
    let parsedMessage
    try {
      parsedMessage = JSON.parse(message) as CeremonyServerMessage
    } catch {
      this.logger.debug(`Received unknown message: ${message}`)
      return
    }

    if (parsedMessage.method === 'joined') {
      this.onJoined.emit({ queueLocation: parsedMessage.queueLocation })
    } else if (parsedMessage.method === 'initiate-upload') {
      this.onInitiateUpload.emit({ uploadLink: parsedMessage.uploadLink })
    } else if (parsedMessage.method === 'initiate-contribution') {
      this.onInitiateContribution.emit(parsedMessage)
    } else if (parsedMessage.method === 'contribution-verified') {
      this.onContributionVerified.emit(parsedMessage)
    } else {
      this.logger.info(`Received message: ${message}`)
    }
  }
}

// Transform net.Socket.connect() callback into a nicer promise style interface
function connectSocket(socket: net.Socket, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject): void => {
    const onConnect = () => {
      socket.off('connect', onConnect)
      socket.off('error', onError)
      resolve()
    }

    const onError = (error: unknown) => {
      socket.off('connect', onConnect)
      socket.off('error', onError)
      reject(error)
    }

    socket.on('error', onError)
    socket.on('connect', onConnect)
    socket.connect(port, host)
  })
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { createRootLogger, setLogPrefixFromConfig } from '@ironfish/sdk'
import { Flags } from '@oclif/core'
import { IronfishCommand } from '../../command'
import { RemoteFlags } from '../../flags'
import { CeremonyServer } from '../../trusted-setup/server'
import { S3Utils } from '../../utils'

export default class Ceremony extends IronfishCommand {
  static hidden = true

  static description = `
     Start the coordination server for the Iron Fish trusted setup ceremony
   `

  static flags = {
    ...RemoteFlags,
    bucket: Flags.string({
      char: 'b',
      parse: (input: string) => Promise.resolve(input.trim()),
      required: false,
      description: 'S3 bucket to download and upload params to',
      default: 'ironfish-contributions',
    }),
  }

  async start(): Promise<void> {
    const { flags } = await this.parse(Ceremony)

    const DEFAULT_HOST = '0.0.0.0'
    const DEFAULT_PORT = 9040

    const s3Client = S3Utils.getS3Client(true)

    setLogPrefixFromConfig(`[%tag%]`)

    const server = new CeremonyServer({
      logger: createRootLogger(),
      port: DEFAULT_PORT,
      host: DEFAULT_HOST,
      s3Bucket: flags.bucket,
      s3Client: s3Client,
      tempDir: this.sdk.config.tempDir,
    })

    await server.start()

    await server.waitForStop()
  }
}

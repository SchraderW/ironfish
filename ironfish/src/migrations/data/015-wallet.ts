/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { IronfishNode } from '../../node'
import { IDatabase } from '../../storage'
import { createDB } from '../../storage/utils'
import { Migration } from '../migration'

export class Migration015 extends Migration {
  path = __filename

  async prepare(node: IronfishNode): Promise<IDatabase> {
    await node.files.mkdir(node.config.walletDatabasePath, { recursive: true })
    return createDB({ location: node.config.walletDatabasePath })
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async forward(): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async backward(): Promise<void> {}
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as yup from 'yup'
import { BlockHeader } from '../../../primitives'
import { ApiNamespace, router } from '../router'
import { RpcBlockHeader, RpcBlockHeaderSchema, serializeRpcBlockHeader } from './types'

export type OnGossipRequest = undefined
export type OnGossipResponse = { blockHeader: RpcBlockHeader }
export const OnGossipRequestSchema: yup.MixedSchema<OnGossipRequest> = yup
  .mixed()
  .oneOf([undefined] as const)

export const OnGossipResponseSchema: yup.ObjectSchema<OnGossipResponse> = yup
  .object({
    blockHeader: RpcBlockHeaderSchema,
  })
  .defined()

router.register<typeof OnGossipRequestSchema, OnGossipResponse>(
  `${ApiNamespace.event}/onGossip`,
  OnGossipRequestSchema,
  (request, node): void => {
    function onGossip(header: BlockHeader) {
      const serialized = serializeRpcBlockHeader(header)
      request.stream({ blockHeader: serialized })
    }

    node.peerNetwork.onBlockGossipReceived.on(onGossip)

    request.onClose.on(() => {
      node.peerNetwork.onBlockGossipReceived.off(onGossip)
    })
  },
)

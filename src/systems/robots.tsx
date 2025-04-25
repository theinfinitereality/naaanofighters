import { defineSystem, EngineState } from '@ir-engine/ecs'
import { SimulationSystemGroup } from '@ir-engine/ecs'
import { UUIDComponent, getComponent } from '@ir-engine/ecs'
import { Engine } from '@ir-engine/ecs'
import { NetworkState, NetworkTopics, WorldNetworkAction } from '@ir-engine/network'
import { Vector3, Quaternion } from 'three'
import { EntityUUID } from '@ir-engine/ecs'
import { dispatchAction, getState } from '@ir-engine/hyperflux'
import { ReferenceSpaceState } from '@ir-engine/spatial'
import { SpawnObjectActions } from '@ir-engine/spatial/src/transform/SpawnObjectActions'

const SPAWN_RADIUS = 5
const SPAWN_COUNT = 10
let spawnAmount = 0

const execute = () => {
  const originEntity = getState(ReferenceSpaceState).originEntity
  const parentUUID = getComponent(originEntity, UUIDComponent)

  if (spawnAmount >= SPAWN_COUNT) return

  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * SPAWN_RADIUS
  
  const position = new Vector3(
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius
  )

  const entityUUID = ('random-entity-' + spawnAmount) as EntityUUID

  dispatchAction(
    SpawnObjectActions.spawnObject({
      position,
      parentUUID,
      entityUUID,
      ownerID: getState(EngineState).userID,
      $topic: NetworkTopics.world,
      $peer: Engine.instance.store.peerID
    })
  )

  spawnAmount++
}

export const RobotSystem = defineSystem({
  uuid: 'RobotSpawnSystem',
  insert: { after: SimulationSystemGroup },
  execute
})
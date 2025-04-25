import { defineSystem, EngineState, Entity, setComponent } from '@ir-engine/ecs'
import { SimulationSystemGroup } from '@ir-engine/ecs'
import { UUIDComponent, getComponent } from '@ir-engine/ecs'
import { Engine } from '@ir-engine/ecs'
import { NetworkState, NetworkTopics, WorldNetworkAction } from '@ir-engine/network'
import { Vector3, Quaternion } from 'three'
import { EntityUUID } from '@ir-engine/ecs'
import { defineState, dispatchAction, getMutableState, getState, useMutableState } from '@ir-engine/hyperflux'
import { ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { SpawnObjectActions } from '@ir-engine/spatial/src/transform/SpawnObjectActions'
import { RobotActions } from '../actions/RobotActions'
import { useEffect } from 'react'
import { GLTFComponent } from '@ir-engine/engine/src/gltf/GLTFComponent'
import config from '@ir-engine/common/src/config'
import { VisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import { EnvMapComponent } from '@ir-engine/engine/src/scene/components/EnvmapComponent'
import { SceneState } from '@ir-engine/engine/src/gltf/GLTFState'

const SPAWN_RADIUS = 5
const SPAWN_COUNT = 10
let spawnAmount = 0

const execute = () => {
  const sceneState = getState(SceneState)
  const lastSceneURL = Object.keys(sceneState)[Object.keys(sceneState).length - 1]
  const originEntity = sceneState[lastSceneURL]
  if(!originEntity) return
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
  console.log('spawning bot')
  dispatchAction(
    RobotActions.spawnRobot({
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

const cdn = config.client.fileServer

const RobotState = defineState({
  name: 'RobotState',
  initial: [] as Entity[],

  receptors: {
    onSpawnRobot: RobotActions.spawnRobot.receive((action) => {
      getMutableState(RobotState).merge([UUIDComponent.getEntityByUUID(action.entityUUID)])
    })
  },

  reactor: () => {
    const state = useMutableState(RobotState)
    useEffect(() => {
      const entity = state.value[state.value.length-1]
      setComponent(entity, GLTFComponent, {src: cdn + '/projects/theinfinitereality/naaanofighters/assets/xbot.vrm'})
      setComponent(entity, VisibleComponent)
      setComponent(entity, EnvMapComponent, {type: 'Skybox'})
    }, [state])
  }
})

export const RobotSystem = defineSystem({
  uuid: 'RobotSpawnSystem',
  insert: { after: SimulationSystemGroup },
  execute
})
import { defineQuery, defineSystem, EngineState, Entity, setComponent } from '@ir-engine/ecs'
import { SimulationSystemGroup } from '@ir-engine/ecs'
import { UUIDComponent, getComponent } from '@ir-engine/ecs'
import { Engine } from '@ir-engine/ecs'
import { NetworkState, NetworkTopics, WorldNetworkAction } from '@ir-engine/network'
import { Vector3, Quaternion, Matrix4 } from 'three'
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
import { openWelcomeModal } from './../components/WelcomeModal'
import { AvatarAnimationComponent, AvatarRigComponent } from '@ir-engine/engine/src/avatar/components/AvatarAnimationComponent'
import { AvatarComponent } from '@ir-engine/engine/src/avatar/components/AvatarComponent'
import { AnimationComponent } from '@ir-engine/engine/src/avatar/components/AnimationComponent'
import { RigidBodyComponent } from '@ir-engine/spatial/src/physics/components/RigidBodyComponent'
import { BodyTypes } from '@ir-engine/spatial/src/physics/types/PhysicsTypes'

const SPAWN_RADIUS = 5
const SPAWN_COUNT = 10
let spawnAmount = 0

const botQuery = defineQuery([RigidBodyComponent, TransformComponent])
const BOT_SPEED = 2
const MIN_DISTANCE_SQ = 0.5

const _direction = new Vector3()
const _targetPosition = new Vector3()
const _botPosition = new Vector3()
const _quaternion = new Quaternion()
const _flip = new Quaternion().set(0,1,0,0)
const _up = new Vector3(0, 1, 0)
const _matrix = new Matrix4()

const execute = () => {
  const sceneState = getState(SceneState)
  const lastSceneURL = Object.keys(sceneState)[Object.keys(sceneState).length - 1]
  const originEntity = sceneState[lastSceneURL]
  if(!originEntity) return
  const parentUUID = getComponent(originEntity, UUIDComponent)

  ///////// do the movement of the bots
  const selfAvatarEntity = AvatarComponent.getSelfAvatarEntity()
  if (!selfAvatarEntity) return
  // get avatar position
  TransformComponent.getWorldPosition(selfAvatarEntity, _targetPosition)

  // Update each bot's velocity to move towards avatar
  for (const botEntity of botQuery()) {
    const rigidbody = getComponent(botEntity, RigidBodyComponent)
    TransformComponent.getWorldPosition(botEntity, _botPosition)

    // Calculate direction to avatar
    _direction.subVectors(_targetPosition, _botPosition)
    if(_direction.lengthSq() < MIN_DISTANCE_SQ) continue
    _direction.normalize()
    _direction.multiplyScalar(BOT_SPEED)
    
    // Set y velocity to 0 to keep bots grounded
    _direction.y = 0
    
    // Apply velocity
    rigidbody.linearVelocity.copy(_direction)
    rigidbody.targetKinematicPosition.copy(rigidbody.position).add(_direction.multiplyScalar(0.01))
    // Set rotation to face movement direction
    _quaternion.setFromRotationMatrix(
      _matrix.lookAt(_botPosition, _targetPosition, _up)
    ).multiply(_flip)
    rigidbody.targetKinematicRotation.copy(_quaternion)
  }

  if (spawnAmount >= SPAWN_COUNT) return

  ///////// do the spawning

  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * SPAWN_RADIUS
  
  const position = new Vector3(
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius
  )

  const entityUUID = ('random-entity-' + spawnAmount) as EntityUUID
  
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

      setComponent(entity, AvatarComponent)
      setComponent(entity, AvatarAnimationComponent)
      setComponent(entity, AvatarRigComponent)
      setComponent(entity, RigidBodyComponent, {
        type: BodyTypes.Kinematic,
        allowRolling: false,
        enabledRotations: [false, true, false]
      })

      if (state.value.length === 1) {
        openWelcomeModal()
      }
    }, [state])
  }
})

export const RobotSystem = defineSystem({
  uuid: 'RobotSpawnSystem',
  insert: { after: SimulationSystemGroup },
  execute
})
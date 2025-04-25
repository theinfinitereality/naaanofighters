import config from '@ir-engine/common/src/config'
import {
  defineQuery,
  defineSystem,
  Engine,
  EngineState,
  EntityUUID,
  getComponent,
  setComponent,
  SimulationSystemGroup,
  UUIDComponent
} from '@ir-engine/ecs'
import {
  AvatarAnimationComponent,
  AvatarRigComponent
} from '@ir-engine/engine/src/avatar/components/AvatarAnimationComponent'
import { AvatarComponent } from '@ir-engine/engine/src/avatar/components/AvatarComponent'
import { GLTFComponent } from '@ir-engine/engine/src/gltf/GLTFComponent'
import { SceneState } from '@ir-engine/engine/src/gltf/GLTFState'
import { EnvMapComponent } from '@ir-engine/engine/src/scene/components/EnvmapComponent'
import { defineState, dispatchAction, getMutableState, getState, useMutableState, UserID } from '@ir-engine/hyperflux'
import { NetworkTopics } from '@ir-engine/network'
import { TransformComponent } from '@ir-engine/spatial'
import { RigidBodyComponent } from '@ir-engine/spatial/src/physics/components/RigidBodyComponent'
import { BodyTypes } from '@ir-engine/spatial/src/physics/types/PhysicsTypes'
import { VisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import React, { useEffect } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { RobotActions } from '../actions/RobotActions'
import { BotComponent } from '../components/BotComponents'
import { openWelcomeModal } from './../components/WelcomeModal'

const SPAWN_RADIUS = 10
const SPAWN_COUNT = 3
let spawnAmount = 0

const botQuery = defineQuery([RigidBodyComponent, TransformComponent, BotComponent])
const BOT_SPEED = 2
const MIN_DISTANCE_SQ = 0.5

const _direction = new Vector3()
const _targetPosition = new Vector3()
const _botPosition = new Vector3()
const _quaternion = new Quaternion()
const _flip = new Quaternion().set(0, 1, 0, 0)
const _up = new Vector3(0, 1, 0)
const _matrix = new Matrix4()

const execute = () => {
  const sceneState = getState(SceneState)
  const lastSceneURL = Object.keys(sceneState)[Object.keys(sceneState).length - 1]
  const originEntity = sceneState[lastSceneURL]
  if (!originEntity) return
  const parentUUID = getComponent(originEntity, UUIDComponent)

  ///////// do the movement of the bots
  const selfAvatarEntity = AvatarComponent.getSelfAvatarEntity()
  if (!selfAvatarEntity) return
  // get avatar position
  TransformComponent.getWorldPosition(selfAvatarEntity, _targetPosition)

  // Update each bot's velocity to move towards avatar
  for (const bot of getState(RobotState)) {
    if (bot.owner !== getState(EngineState).userID) continue
    const botEntity = UUIDComponent.getEntityByUUID(bot.entityUUID)
    const rigidbody = getComponent(botEntity, RigidBodyComponent)
    TransformComponent.getWorldPosition(botEntity, _botPosition)

    // Calculate direction to avatar
    _direction.subVectors(_targetPosition, _botPosition)
    if (_direction.lengthSq() < MIN_DISTANCE_SQ) continue
    _direction.normalize()
    _direction.multiplyScalar(BOT_SPEED)

    // Set y velocity to 0 to keep bots grounded
    _direction.y = 0

    // Apply velocity
    rigidbody.linearVelocity.copy(_direction)
    rigidbody.targetKinematicPosition.copy(rigidbody.position).add(_direction.multiplyScalar(0.01))
    // Set rotation to face movement direction
    _quaternion.setFromRotationMatrix(_matrix.lookAt(_botPosition, _targetPosition, _up)).multiply(_flip)
    rigidbody.targetKinematicRotation.copy(_quaternion)
  }

  if (spawnAmount >= SPAWN_COUNT) return

  ///////// do the spawning

  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * SPAWN_RADIUS

  const position = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)

  const entityUUID = ('random-entity-' + spawnAmount + UUIDComponent.generateUUID()) as EntityUUID

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
  initial: [] as { owner: UserID; entityUUID: EntityUUID }[],

  receptors: {
    onSpawnRobot: RobotActions.spawnRobot.receive((action) => {
      getMutableState(RobotState).merge([{ owner: action.ownerID, entityUUID: action.entityUUID }])
    })
  },

  reactor: () => {
    const state = useMutableState(RobotState)
    useEffect(() => {
      if (state.value.length === 1) {
        openWelcomeModal()
      }
    }, [])

    return (
      <>
        {state.value.map((bot) => (
          <BotNetworkReactor entityUUID={bot.entityUUID} owner={bot.owner} />
        ))}
      </>
    )
  }
})

const BotNetworkReactor = (props: { entityUUID: EntityUUID; owner: UserID }) => {
  const { entityUUID, owner } = props
  useEffect(() => {
    const entity = UUIDComponent.getEntityByUUID(entityUUID)
    setComponent(entity, GLTFComponent, { src: cdn + '/projects/theinfinitereality/naaanofighters/assets/xbot.vrm' })
    setComponent(entity, VisibleComponent)
    setComponent(entity, EnvMapComponent, { type: 'Skybox' })

    setComponent(entity, BotComponent)
    setComponent(entity, AvatarComponent)
    setComponent(entity, AvatarAnimationComponent)
    setComponent(entity, AvatarRigComponent)
    setComponent(entity, RigidBodyComponent, {
      type: BodyTypes.Kinematic,
      allowRolling: false,
      enabledRotations: [false, true, false]
    })
    console.log(entity, 'set gltf here')
  }, [entityUUID])
  return null
}

export const RobotSystem = defineSystem({
  uuid: 'RobotSpawnSystem',
  insert: { after: SimulationSystemGroup },
  execute
})

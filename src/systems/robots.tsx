import config from '@ir-engine/common/src/config'
import {
  defineQuery,
  defineSystem,
  Engine,
  EngineState,
  EntityUUID,
  getComponent,
  hasComponent,
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
import {
  defineState,
  dispatchAction,
  getMutableState,
  getState,
  none,
  useMutableState,
  UserID
} from '@ir-engine/hyperflux'
import { NetworkTopics } from '@ir-engine/network'
import { TransformComponent } from '@ir-engine/spatial'
import { Physics, RaycastArgs } from '@ir-engine/spatial/src/physics/classes/Physics'
import { ColliderComponent } from '@ir-engine/spatial/src/physics/components/ColliderComponent'
import { RigidBodyComponent } from '@ir-engine/spatial/src/physics/components/RigidBodyComponent'
import { CollisionGroups } from '@ir-engine/spatial/src/physics/enums/CollisionGroups'
import { getInteractionGroups } from '@ir-engine/spatial/src/physics/functions/getInteractionGroups'
import { BodyTypes, SceneQueryType } from '@ir-engine/spatial/src/physics/types/PhysicsTypes'
import { VisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import React, { useEffect } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { RobotActions } from '../actions/RobotActions'
import { BotComponent } from '../components/BotComponents'
import { openWelcomeModal } from './../components/WelcomeModal'

const SPAWN_RADIUS = 10
const SPAWN_COUNT = 3
let spawnAmount = 0

const BOT_SPEED = 2
const AVOIDANCE_DISTANCE = 0.1

const _direction = new Vector3()
const _targetPosition = new Vector3()
const _botPosition = new Vector3()
const _quaternion = new Quaternion()
const _up = new Vector3(0, 1, 0)
const _matrix = new Matrix4()
const _flip = new Quaternion(0, 1, 0, 0)

// Raycast configuration for obstacle detection
const raycastQuery = {
  type: SceneQueryType.Closest,
  origin: new Vector3(),
  direction: new Vector3(),
  maxDistance: AVOIDANCE_DISTANCE,
  groups: getInteractionGroups(CollisionGroups.Default, CollisionGroups.Default)
} as RaycastArgs

const botQuery = defineQuery([BotComponent, RigidBodyComponent, TransformComponent, UUIDComponent])

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
  for (const bot of botQuery()) {
    const botComponent = getComponent(bot, BotComponent)

    if (botComponent.target !== getState(EngineState).userID + '_avatar') continue
    const rigidbody = getComponent(bot, RigidBodyComponent)
    TransformComponent.getWorldPosition(bot, _botPosition)

    // Calculate base direction to avatar
    _direction.subVectors(_targetPosition, _botPosition)

    _direction.normalize()

    // Check for obstacles using raycast
    // avoid self collider
    raycastQuery.excludeCollider = bot
    raycastQuery.origin.copy(_botPosition).setY(_botPosition.y + 1)
    raycastQuery.direction.copy(_direction)

    const world = Physics.getWorld(bot)
    if (!world) continue

    const hits = Physics.castRay(world, raycastQuery)

    // If we hit something, adjust direction to avoid it
    if (hits.length > 0) {
      continue
    }

    // Set velocity, kinematic position to move towards self avatar
    _direction.multiplyScalar(BOT_SPEED)
    _direction.y = 0 // Keep grounded
    rigidbody.linearVelocity.copy(_direction)
    rigidbody.targetKinematicPosition.copy(_botPosition.add(_direction.multiplyScalar(0.01)))

    // Set rotation to face movement direction
    _quaternion.setFromRotationMatrix(_matrix.lookAt(new Vector3(), _direction, _up)).multiply(_flip)

    rigidbody.targetKinematicRotation.copy(_quaternion)

    ///////// do health
    if (botComponent.health <= 0) {
      // Get the robot's position for the explosion effect
      const position = new Vector3()
      TransformComponent.getWorldPosition(bot, position)

      // Dispatch the destroyRobot action
      dispatchAction(
        RobotActions.destroyRobot({
          entityUUID: getComponent(bot, UUIDComponent)
        })
      )
    }
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
  initial: [] as { owner: UserID; entityUUID: EntityUUID; position: Vector3 }[],

  receptors: {
    onSpawnRobot: RobotActions.spawnRobot.receive((action) => {
      getMutableState(RobotState).merge([
        { owner: action.ownerID, entityUUID: action.entityUUID, position: action.position }
      ])
    }),

    onDestroyRobot: RobotActions.destroyRobot.receive((action) => {
      // Remove the robot from the state
      const state = getMutableState(RobotState)
      const index = state.value.findIndex((bot) => bot.entityUUID === action.entityUUID)
      if (index >= 0) {
        state[index].set(none)
      }
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
          <BotNetworkReactor entityUUID={bot.entityUUID} owner={bot.owner} position={bot.position} />
        ))}
      </>
    )
  }
})

const BotNetworkReactor = (props: { entityUUID: EntityUUID; owner: UserID; position: Vector3 }) => {
  const { entityUUID, owner, position } = props
  useEffect(() => {
    const entity = UUIDComponent.getOrCreateEntityByUUID(entityUUID)
    if (hasComponent(entity, BotComponent)) return
    setComponent(entity, TransformComponent, { position })
    setComponent(entity, GLTFComponent, { src: cdn + '/projects/theinfinitereality/naaanofighters/assets/xbot.vrm' })
    setComponent(entity, VisibleComponent)
    setComponent(entity, EnvMapComponent, { type: 'Skybox' })

    setComponent(entity, BotComponent, { target: (owner + '_avatar') as EntityUUID })
    setComponent(entity, AvatarComponent)
    setComponent(entity, AvatarAnimationComponent)
    setComponent(entity, AvatarRigComponent)
    setComponent(entity, RigidBodyComponent, {
      type: BodyTypes.Kinematic,
      allowRolling: false,
      enabledRotations: [false, true, false]
    })
    setComponent(entity, ColliderComponent, {
      shape: 'capsule',
      height: 1.5,
      radius: 0.25,
      centerOffset: new Vector3(0, 0.75, 0)
    })
  }, [entityUUID])
  return null
}

export const RobotSystem = defineSystem({
  uuid: 'bots.RobotSpawnSystem',
  insert: { after: SimulationSystemGroup },
  execute
})

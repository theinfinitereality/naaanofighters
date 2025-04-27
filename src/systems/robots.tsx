import config from '@ir-engine/common/src/config'
import {
  createEntity,
  defineQuery,
  defineSystem,
  Engine,
  EngineState,
  EntityTreeComponent,
  EntityUUID,
  getComponent,
  getMutableComponent,
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
  NO_PROXY,
  none,
  useMutableState,
  UserID
} from '@ir-engine/hyperflux'
import { NetworkTopics } from '@ir-engine/network'
import { TransformComponent } from '@ir-engine/spatial'
import { RaycastArgs } from '@ir-engine/spatial/src/physics/classes/Physics'
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

  const selfAvatarEntity = AvatarComponent.getSelfAvatarEntity()
  if (!selfAvatarEntity) return
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

    /**@todo WHY DOES THIS BREAK????? WHY DOES EXCLUDE COLLIDER STOP WORKING ON RESPAWNED BOTS??? */
    // const colliderEntity = UUIDComponent.getEntityByUUID(getComponent(bot, UUIDComponent) + '_collider' as EntityUUID)
    // raycastQuery.excludeCollider = colliderEntity
    // raycastQuery.origin.copy(_botPosition).setY(_botPosition.y + 1)
    // raycastQuery.direction.copy(_direction)

    // const world = Physics.getWorld(bot)
    // if (!world) continue

    // const hits = Physics.castRay(world, raycastQuery)

    // // If we hit something, adjust direction to avoid it
    // if (hits.length > 0) {
    //   continue
    // }

    // Set velocity, kinematic position to move towards self avatar
    _direction.multiplyScalar(BOT_SPEED)
    _direction.y = 0 // Keep grounded
    rigidbody.linearVelocity.copy(_direction)
    rigidbody.targetKinematicPosition.copy(_botPosition.add(_direction.multiplyScalar(0.01)))

    // Set rotation to face movement direction
    _quaternion.setFromRotationMatrix(_matrix.lookAt(new Vector3(), _direction, _up)).multiply(_flip)

    rigidbody.targetKinematicRotation.copy(_quaternion)
  }

  if (botQuery().length >= SPAWN_COUNT) return

  ///////// do the spawning

  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * SPAWN_RADIUS

  const position = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)

  const entityUUID = ('random-entity-' + UUIDComponent.generateUUID()) as EntityUUID

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
}

const cdn = config.client.fileServer

const RobotState = defineState({
  name: 'RobotState',
  initial: {} as Record<
    EntityUUID,
    {
      owner: UserID
      position: Vector3
      health: number
    }
  >,

  receptors: {
    onSpawnRobot: RobotActions.spawnRobot.receive((action) => {
      getMutableState(RobotState)[action.entityUUID].set({
        owner: action.ownerID,
        position: action.position,
        health: 100
      })
    }),

    onDestroyRobot: RobotActions.destroyRobot.receive((action) => {
      getMutableState(RobotState)[action.entityUUID].set(none)
    }),

    onDamageRobot: RobotActions.damageRobot.receive((action) => {
      const state = getMutableState(RobotState)
      if (!state[action.entityUUID].value) return
      state[action.entityUUID].health.set(state[action.entityUUID].health.get(NO_PROXY) - action.damage)
    })
  },

  reactor: () => {
    const state = useMutableState(RobotState)
    useEffect(() => {
      if (Object.keys(state.value).length === 1) {
        openWelcomeModal()
      }
    }, [])

    return (
      <>
        {state.keys.map((entityUUID: EntityUUID) => (
          <BotNetworkReactor
            key={entityUUID}
            entityUUID={entityUUID}
            owner={state[entityUUID].owner.value}
            position={state[entityUUID].position.value}
          />
        ))}
      </>
    )
  }
})

const BotNetworkReactor = (props: { entityUUID: EntityUUID; owner: UserID; position: Vector3 }) => {
  const { entityUUID, owner, position } = props
  const robotState = useMutableState(RobotState)

  // Initial setup of the bot entity
  useEffect(() => {
    const entity = UUIDComponent.getEntityByUUID(entityUUID)
    if (hasComponent(entity, BotComponent)) return
    setComponent(entity, TransformComponent, { position })
    setComponent(entity, GLTFComponent, { src: cdn + '/projects/theinfinitereality/naaanofighters/assets/xbot.vrm' })
    setComponent(entity, VisibleComponent)
    setComponent(entity, EnvMapComponent, { type: 'Skybox' })

    setComponent(entity, BotComponent, {
      target: (owner + '_avatar') as EntityUUID,
      health: 100
    })

    setComponent(entity, AvatarComponent)
    setComponent(entity, AvatarAnimationComponent)
    setComponent(entity, AvatarRigComponent)
    setComponent(entity, RigidBodyComponent, {
      type: BodyTypes.Kinematic,
      allowRolling: false,
      enabledRotations: [false, true, false]
    })

    //create child entity collider
    const colliderEntity = createEntity()

    setComponent(colliderEntity, ColliderComponent, {
      shape: 'capsule',
      collisionLayer: CollisionGroups.Default,
      collisionMask: CollisionGroups.Default,
      restitution: 0.8
    })
    setComponent(colliderEntity, EntityTreeComponent, { parentEntity: entity })
    setComponent(colliderEntity, TransformComponent, {
      scale: new Vector3(0.25, 1, 0.25),
      position: new Vector3(0, 0.5, 0)
    })
    setComponent(colliderEntity, UUIDComponent, (entityUUID + '_collider') as EntityUUID)
  }, [entityUUID])

  // Sync health from state to BotComponent
  useEffect(() => {
    const entity = UUIDComponent.getEntityByUUID(entityUUID)
    if (!entity || !hasComponent(entity, BotComponent)) return

    const botState = robotState[entityUUID]
    if (!botState?.value) return

    const health = botState.health.value
    if (typeof health === 'number') {
      const botComponent = getMutableComponent(entity, BotComponent)
      botComponent.health.set(health)
    }

    if (getComponent(entity, BotComponent).health <= 0) {
      dispatchAction(
        RobotActions.destroyRobot({
          entityUUID
        })
      )
    }
  }, [entityUUID, robotState[entityUUID]?.health])

  return null
}

export const RobotSystem = defineSystem({
  uuid: 'bots.RobotSpawnSystem',
  insert: { after: SimulationSystemGroup },
  execute
})

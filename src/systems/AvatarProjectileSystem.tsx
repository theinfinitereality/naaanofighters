import {
  defineQuery,
  defineSystem,
  ECSState,
  EntityUUID,
  getComponent,
  InputSystemGroup,
  SimulationSystemGroup,
  UUIDComponent
} from '@ir-engine/ecs'
import { AvatarComponent } from '@ir-engine/engine/src/avatar/components/AvatarComponent'
import { SceneState } from '@ir-engine/engine/src/gltf/GLTFState'
import { defineState, dispatchAction, getMutableState, getState, useMutableState, UserID } from '@ir-engine/hyperflux'
import { NetworkTopics } from '@ir-engine/network'
import { ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { Q_Y_180 } from '@ir-engine/spatial/src/common/constants/MathConstants'
import { InputComponent } from '@ir-engine/spatial/src/input/components/InputComponent'
import { RigidBodyComponent } from '@ir-engine/spatial/src/physics/components/RigidBodyComponent'
import React from 'react'
import { Quaternion, Vector3 } from 'three'
import { ProjectileActions } from '../actions/ProjectileActions'
import { ProjectileComponent } from '../components/ProjectileComponent'
import { ProjectileNetworkReactor } from '../components/ProjectileNetworkReactor'

const PROJECTILE_SPAWN_OFFSET = new Vector3(0, 1.5, 0) // Spawn in front of avatar at head height
const PROJECTILE_SPEED = 20 // Adjust speed as needed

// Forward direction vector
const _forward = new Vector3(0, 0, -1)
const _rotation = new Quaternion()
// Temporary vector for position
const _position = new Vector3()
const _velocity = new Vector3()
const projectileQuery = defineQuery([ProjectileComponent])

// Shared cooldown state
let cooldown = 0

// Input system execute function - handles input detection and projectile spawning
const executeInputSystem = () => {
  // Get the self avatar entity
  const selfAvatarEntity = AvatarComponent.getSelfAvatarEntity()
  if (!selfAvatarEntity) return

  // Get input component from viewer entity
  const viewerEntity = getState(ReferenceSpaceState).viewerEntity
  const buttons = InputComponent.getButtons(viewerEntity)

  // Update cooldown
  cooldown += getState(ECSState).deltaSeconds
  if (cooldown < 0.25) return

  // Check if primary click is pressed
  if (!buttons.PrimaryClick?.pressed) return

  // Get the scene entity to use as parent
  const sceneState = getState(SceneState)
  const lastSceneURL = Object.keys(sceneState)[Object.keys(sceneState).length - 1]
  const originEntity = sceneState[lastSceneURL]
  if (!originEntity) return
  const parentUUID = getComponent(originEntity, UUIDComponent)

  TransformComponent.getWorldPosition(selfAvatarEntity, _position)
  TransformComponent.getWorldRotation(selfAvatarEntity, _rotation)

  _position.add(PROJECTILE_SPAWN_OFFSET)

  // Generate a unique ID for the projectile
  const entityUUID = ('projectile-' + UUIDComponent.generateUUID()) as EntityUUID

  // Dispatch action to spawn projectile
  dispatchAction(
    ProjectileActions.spawnProjectile({
      position: _position,
      rotation: _rotation.multiply(Q_Y_180),
      parentUUID,
      entityUUID,
      $topic: NetworkTopics.world
    })
  )
  cooldown = 0
}

// Movement system execute function - handles projectile movement
const executeMovementSystem = () => {
  // Update projectile movement
  for (const projectileEntity of projectileQuery()) {
    //if (getState(EngineState).userID + '_avatar' !== getComponent(projectileEntity, ProjectileComponent).ownerEntity) continue
    const rigidbody = getComponent(projectileEntity, RigidBodyComponent)

    // Get current position and rotation
    TransformComponent.getWorldPosition(projectileEntity, _position)
    TransformComponent.getWorldRotation(projectileEntity, _rotation)

    // Calculate velocity based on forward direction and rotation
    _velocity.copy(_forward).applyQuaternion(_rotation).multiplyScalar(PROJECTILE_SPEED)

    // Apply velocity and update target position
    rigidbody.linearVelocity.copy(_velocity)
    rigidbody.targetKinematicPosition.copy(_position).add(_velocity.multiplyScalar(0.015))
  }
}

// Define the ProjectileState to track active projectiles
export const ProjectileState = defineState({
  name: 'ProjectileState',
  initial: [] as { owner: UserID; entityUUID: EntityUUID; position: Vector3; rotation: Quaternion }[],

  receptors: {
    onSpawnProjectile: ProjectileActions.spawnProjectile.receive((action) => {
      // Add the projectile to the state
      getMutableState(ProjectileState).merge([
        {
          owner: action.ownerID,
          entityUUID: action.entityUUID,
          position: action.position,
          rotation: action.rotation
        }
      ])
    })
  },

  reactor: () => {
    const state = useMutableState(ProjectileState)

    return (
      <>
        {state.value.map((projectile) => (
          <ProjectileNetworkReactor
            key={projectile.entityUUID}
            entityUUID={projectile.entityUUID}
            owner={projectile.owner}
            position={projectile.position}
            rotation={projectile.rotation}
          />
        ))}
      </>
    )
  }
})

// Export the input system
export const AvatarProjectileInputSystem = defineSystem({
  uuid: 'AvatarProjectileInputSystem',
  insert: { with: InputSystemGroup },
  execute: executeInputSystem
})

// Export the movement system
export const AvatarProjectileMovementSystem = defineSystem({
  uuid: 'AvatarProjectileMovementSystem',
  insert: { after: SimulationSystemGroup },
  execute: executeMovementSystem
})

import {
  defineQuery,
  defineSystem,
  getComponent,
  hasComponent,
  SimulationSystemGroup,
  UUIDComponent
} from '@ir-engine/ecs'
import { dispatchAction } from '@ir-engine/hyperflux'
import { CollisionComponent } from '@ir-engine/spatial/src/physics/components/CollisionComponent'
import { CollisionEvents } from '@ir-engine/spatial/src/physics/types/PhysicsTypes'
import { ProjectileActions } from '../actions/ProjectileActions'
import { RobotActions } from '../actions/RobotActions'
import { BotComponent } from '../components/BotComponents'
import { ProjectileComponent } from '../components/ProjectileComponent'

// Query for projectiles that have collision components
const projectileCollisionQuery = defineQuery([ProjectileComponent, CollisionComponent])

const execute = () => {
  // Process each projectile that has collision data
  for (const projectileEntity of projectileCollisionQuery()) {
    const collisionComponent = getComponent(projectileEntity, CollisionComponent)

    // Check each entity the projectile has collided with
    for (const [collidedEntity, hit] of collisionComponent) {
      // Only process new collisions
      if (hit.type !== CollisionEvents.COLLISION_START) continue

      // Check if the collided entity is a bot
      if (hasComponent(collidedEntity, BotComponent)) {
        dispatchAction(
          RobotActions.damageRobot({
            entityUUID: getComponent(collidedEntity, UUIDComponent),
            damage: 100
          })
        )

        // Destroy the projectile
        dispatchAction(
          ProjectileActions.destroyProjectile({
            entityUUID: getComponent(projectileEntity, UUIDComponent)
          })
        )
      }
    }
  }
}

export const ProjectileCollisionSystem = defineSystem({
  uuid: 'bots.ProjectileCollisionSystem',
  insert: { with: SimulationSystemGroup },
  execute
})

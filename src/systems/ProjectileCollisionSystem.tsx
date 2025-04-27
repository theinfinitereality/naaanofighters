import {
  defineQuery,
  defineSystem,
  getComponent,
  getMutableComponent,
  hasComponent,
  SimulationSystemGroup,
  UUIDComponent
} from '@ir-engine/ecs'
import { dispatchAction, NO_PROXY } from '@ir-engine/hyperflux'
import { CollisionComponent } from '@ir-engine/spatial/src/physics/components/CollisionComponent'
import { CollisionEvents } from '@ir-engine/spatial/src/physics/types/PhysicsTypes'
import { ProjectileActions } from '../actions/ProjectileActions'
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
        // Get the bot component and reduce health
        const botComponent = getMutableComponent(collidedEntity, BotComponent)
        botComponent.health.set(botComponent.health.get(NO_PROXY) - 100)

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

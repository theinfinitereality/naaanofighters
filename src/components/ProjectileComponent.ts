import { defineComponent } from '@ir-engine/ecs'
import { S } from '@ir-engine/ecs/src/schemas/JSONSchemas'

export const ProjectileComponent = defineComponent({
  name: 'ProjectileComponent',
  jsonID: 'ee.naaanofighters.projectile',

  schema: S.Object({
    // Time in milliseconds before the projectile is automatically destroyed
    lifetime: S.Number(5000),
    // The entity that spawned this projectile
    ownerEntity: S.EntityUUID()
  })
})

import { defineAction } from '@ir-engine/hyperflux'
import { SpawnObjectActions } from '@ir-engine/spatial/src/transform/SpawnObjectActions'

export class ProjectileActions {
  static spawnProjectile = defineAction(
    SpawnObjectActions.spawnObject.extend({
      type: 'ee.naaanofighters.SPAWN_PROJECTILE'
    })
  )
}

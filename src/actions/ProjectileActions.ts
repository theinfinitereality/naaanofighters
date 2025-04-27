import { defineAction } from '@ir-engine/hyperflux'
import { WorldNetworkAction } from '@ir-engine/network'
import { matchesQuaternion, matchesVector3 } from '@ir-engine/spatial/src/common/functions/MatchesUtils'

export class ProjectileActions {
  static spawnProjectile = defineAction(
    WorldNetworkAction.spawnEntity.extend({
      type: 'player.SPAWN_PROJECTILE',
      position: matchesVector3,
      rotation: matchesQuaternion
    })
  )

  static destroyProjectile = defineAction(
    WorldNetworkAction.destroyEntity.extend({
      type: 'player.DESTROY_PROJECTILE'
    })
  )
}

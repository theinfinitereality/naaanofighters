import { matchesEntityUUID } from '@ir-engine/ecs'
import { defineAction, matches } from '@ir-engine/hyperflux'
import { NetworkTopics, WorldNetworkAction } from '@ir-engine/network'
import { matchesVector3 } from '@ir-engine/spatial/src/common/functions/MatchesUtils'

export class RobotActions {
  static spawnRobot = defineAction(
    WorldNetworkAction.spawnEntity.extend({
      type: 'bots.SPAWN_ROBOT',
      $cache: true,
      position: matchesVector3
    })
  )

  static destroyRobot = defineAction(
    WorldNetworkAction.destroyEntity.extend({
      type: 'bots.DESTROY_ROBOT',
      $cache: true
    })
  )

  static damageRobot = defineAction({
    type: 'bots.DAMAGE_ROBOT',
    entityUUID: matchesEntityUUID,
    damage: matches.number,
    $topic: NetworkTopics.world
  })
}

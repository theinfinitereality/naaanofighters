import { defineAction } from '@ir-engine/hyperflux'
import { SpawnObjectActions } from '@ir-engine/spatial/src/transform/SpawnObjectActions'
import matches from 'ts-matches'

export class RobotActions {
  static spawnRobot = defineAction(
    SpawnObjectActions.spawnObject.extend({
      type: 'ee.naaanofighters.SPAWN_ROBOT'
    })
  )
}
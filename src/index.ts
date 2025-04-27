import { AvatarProjectileInputSystem, AvatarProjectileMovementSystem } from './systems/AvatarProjectileSystem'
import { ProjectileCollisionSystem } from './systems/ProjectileCollisionSystem'
import { RobotSystem } from './systems/robots'

export default {
  systems: [RobotSystem, AvatarProjectileInputSystem, AvatarProjectileMovementSystem, ProjectileCollisionSystem]
}

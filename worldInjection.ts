import { AvatarProjectileInputSystem, AvatarProjectileMovementSystem } from './src/systems/AvatarProjectileSystem'
import { ProjectileCollisionSystem } from './src/systems/ProjectileCollisionSystem'
import { RobotSystem } from './src/systems/robots'

export const systems = [
  RobotSystem,
  AvatarProjectileInputSystem,
  AvatarProjectileMovementSystem,
  ProjectileCollisionSystem
]

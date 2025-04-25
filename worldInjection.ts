import { RobotSystem } from './src/systems/robots'

export const systems = [RobotSystem]
console.log('world injection')
import(RobotSystem)

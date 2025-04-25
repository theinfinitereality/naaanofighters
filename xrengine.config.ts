import type { ProjectConfigInterface } from '@ir-engine/projects/ProjectConfigInterface'

const config: ProjectConfigInterface = {
  onEvent: undefined,
  thumbnail: '/static/etherealengine_thumbnail.jpg',
  routes: {},
  worldInjection: () => import('./worldInjection'),
  services: undefined,
  databaseSeed: undefined
}

export default config

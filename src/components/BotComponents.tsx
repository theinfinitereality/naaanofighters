import { defineComponent, S } from '@ir-engine/ecs'

export const BotComponent = defineComponent({
  name: 'BotComponent',
  schema: S.Object({
    health: S.Number(100),
    target: S.EntityUUID()
  })
})

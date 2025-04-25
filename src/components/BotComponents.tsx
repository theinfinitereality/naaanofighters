import { defineComponent, S } from '@ir-engine/ecs'

export const BotComponent = defineComponent({
  name: 'BotComponent',
  schema: S.Bool(true)
})

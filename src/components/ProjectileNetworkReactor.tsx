import config from '@ir-engine/common/src/config'
import { EntityUUID, UUIDComponent, setComponent } from '@ir-engine/ecs'
import { EnvMapComponent } from '@ir-engine/engine/src/scene/components/EnvmapComponent'
import { PrimitiveGeometryComponent } from '@ir-engine/engine/src/scene/components/PrimitiveGeometryComponent'
import { GeometryTypeEnum } from '@ir-engine/engine/src/scene/constants/GeometryTypeEnum'
import { UserID } from '@ir-engine/hyperflux'
import { TransformComponent } from '@ir-engine/spatial'
import { ColliderComponent } from '@ir-engine/spatial/src/physics/components/ColliderComponent'
import { RigidBodyComponent } from '@ir-engine/spatial/src/physics/components/RigidBodyComponent'
import { CollisionGroups } from '@ir-engine/spatial/src/physics/enums/CollisionGroups'
import { BodyTypes } from '@ir-engine/spatial/src/physics/types/PhysicsTypes'
import { VisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import { useEffect } from 'react'
import { Vector3 } from 'three'
import { ProjectileComponent } from './ProjectileComponent'

const cdn = config.client.fileServer

export const ProjectileNetworkReactor = (props: { entityUUID: EntityUUID; owner: UserID }) => {
  const { entityUUID, owner } = props

  useEffect(() => {
    const entity = UUIDComponent.getEntityByUUID(entityUUID)

    setComponent(entity, VisibleComponent)
    setComponent(entity, EnvMapComponent, { type: 'Skybox' })

    setComponent(entity, RigidBodyComponent, {
      type: BodyTypes.Kinematic
    })

    setComponent(entity, ColliderComponent, {
      shape: 'sphere',
      collisionLayer: CollisionGroups.Default,
      collisionMask: CollisionGroups.Default | CollisionGroups.Ground,
      restitution: 0.8
    })

    setComponent(entity, TransformComponent, {
      scale: new Vector3(0.2, 0.2, 0.2)
    })

    setComponent(entity, PrimitiveGeometryComponent, { geometryType: GeometryTypeEnum.SphereGeometry })

    setComponent(entity, ProjectileComponent, {
      lifetime: 5000,
      ownerEntity: owner as any
    })
  }, [entityUUID])

  return null
}

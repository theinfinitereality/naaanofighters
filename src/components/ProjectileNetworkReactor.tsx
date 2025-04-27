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
import { Quaternion, Vector3 } from 'three'
import { ProjectileComponent } from './ProjectileComponent'

const cdn = config.client.fileServer

export const ProjectileNetworkReactor = (props: {
  entityUUID: EntityUUID
  owner: UserID
  position: Vector3
  rotation: Quaternion
}) => {
  const { entityUUID, owner, position, rotation } = props

  useEffect(() => {
    const entity = UUIDComponent.getOrCreateEntityByUUID(entityUUID)

    setComponent(entity, VisibleComponent)
    setComponent(entity, EnvMapComponent, { type: 'Skybox' })

    setComponent(entity, TransformComponent, {
      position: position,
      rotation: rotation,
      scale: new Vector3(0.2, 0.2, 0.2)
    })

    setComponent(entity, PrimitiveGeometryComponent, { geometryType: GeometryTypeEnum.SphereGeometry })

    setComponent(entity, ProjectileComponent, {
      lifetime: 5000,
      ownerEntity: (owner + '_avatar') as EntityUUID
    })

    setComponent(entity, RigidBodyComponent, {
      type: BodyTypes.Kinematic,
      ccd: true
    })

    setComponent(entity, ColliderComponent, {
      shape: 'sphere',
      collisionLayer: CollisionGroups.Default,
      collisionMask: CollisionGroups.Default,
      restitution: 0.8
    })
  }, [entityUUID])

  return null
}

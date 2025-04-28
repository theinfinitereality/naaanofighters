import config from '@ir-engine/common/src/config'
import { EntityUUID, UUIDComponent, createEntity, setComponent } from '@ir-engine/ecs'
import { EnvMapComponent } from '@ir-engine/engine/src/scene/components/EnvmapComponent'
import { PrimitiveGeometryComponent } from '@ir-engine/engine/src/scene/components/PrimitiveGeometryComponent'
import { GeometryTypeEnum } from '@ir-engine/engine/src/scene/constants/GeometryTypeEnum'
import { UserID } from '@ir-engine/hyperflux'
import { TransformComponent } from '@ir-engine/spatial'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { ColliderComponent } from '@ir-engine/spatial/src/physics/components/ColliderComponent'
import { RigidBodyComponent } from '@ir-engine/spatial/src/physics/components/RigidBodyComponent'
import { CollisionGroups } from '@ir-engine/spatial/src/physics/enums/CollisionGroups'
import { BodyTypes } from '@ir-engine/spatial/src/physics/types/PhysicsTypes'
import { VisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import {
  MaterialInstanceComponent,
  MaterialStateComponent
} from '@ir-engine/spatial/src/renderer/materials/MaterialComponent'
import { useEffect } from 'react'
import { Color, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { ProjectileComponent } from './ProjectileComponent'

const cdn = config.client.fileServer

const material = (uuid: EntityUUID) => {
  let materialEntity = UUIDComponent.getEntityByUUID(uuid)
  if (materialEntity) return uuid
  materialEntity = createEntity()
  setComponent(materialEntity, UUIDComponent, uuid)
  setComponent(materialEntity, MaterialStateComponent, {
    material: new MeshStandardMaterial({
      color: new Color(0, 0, 0),
      emissive: new Color(0.1, 0.5, 1),
      emissiveIntensity: 2
    })
  })
  setComponent(materialEntity, NameComponent, 'projectile-material')
  return uuid
}

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
      scale: new Vector3(0.1, 0.1, 0.1)
    })

    setComponent(entity, PrimitiveGeometryComponent, { geometryType: GeometryTypeEnum.SphereGeometry })

    const uuid = material('projectile-material' as EntityUUID)
    setComponent(entity, MaterialInstanceComponent, {
      uuid: [material(uuid)]
    })

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

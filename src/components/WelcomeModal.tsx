import { ModalState } from '@ir-engine/client-core/src/common/services/ModalState'
import { Button } from '@ir-engine/ui'
import { Popup } from '@ir-engine/ui/src/components/tailwind/Popup'
import Modal from '@ir-engine/ui/src/primitives/tailwind/Modal'
import React from 'react'

// The Welcome Modal component - now just a wrapper around the context function
export const openWelcomeModal = () => {
  // This will be called from outside the React component tree
  // So we need to use the ModalState directly
  ModalState.openModal(
    <Modal
      title="INFINITE BOT SHOOTER"
      onClose={() => ModalState.closeModal()}
      onSubmit={() => ModalState.closeModal()}
      submitButtonText="Let's go"
      className="max-w-md animate-slideIn"
    >
      <div className="flex flex-col gap-4">
        <p className="text-lg">BOTS are coming for you!</p>

        <div className="rounded-lg bg-surface-2 p-4">
          <h3 className="mb-2 font-bold">Game Objectives:</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Click to shoot and destroy them</li>
            <li>Don't let them touch you!</li>
            <li>They respawn forever and ever...</li>
          </ul>
        </div>

        <p>How long can you survive before it crashes?!</p>
      </div>
    </Modal>
  )
}

// Robot Info Popover component
export const RobotInfoPopover = ({
  robotId,
  position,
  trigger
}: {
  robotId: string
  position: { x: number; y: number; z: number }
  trigger: React.ReactNode
}) => {
  return (
    <Popup trigger={trigger} position="right center" keepInside={true} contentStyle={{ zIndex: 1000 }}>
      <div className="w-64 rounded-lg border border-surface-outline-3-1 bg-surface-1 p-4 shadow-lg">
        <h3 className="mb-2 text-lg font-bold text-text-primary">Robot #{robotId}</h3>

        <div className="mb-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Status:</span>
            <span className="font-medium text-green-500">Active</span>
          </div>

          <div className="flex justify-between">
            <span className="text-text-secondary">Position:</span>
            <span className="font-mono text-text-primary">
              {position.x.toFixed(1)}, {position.y.toFixed(1)}, {position.z.toFixed(1)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-text-secondary">Battery:</span>
            <span className="font-medium text-text-primary">87%</span>
          </div>

          <div className="flex justify-between">
            <span className="text-text-secondary">Tasks:</span>
            <span className="font-medium text-text-primary">2 active</span>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            Details
          </Button>
          <Button size="sm" className="flex-1">
            Control
          </Button>
        </div>
      </div>
    </Popup>
  )
}

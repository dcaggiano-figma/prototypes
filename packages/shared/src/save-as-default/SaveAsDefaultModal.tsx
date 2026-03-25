import { useMemo, useState } from 'react'
import { Button, Modal } from '@figma/fpl-components'
import { Icon24Clipboard, Icon24Check, Icon24Download } from '@figma/fpl-icons'
import { useSceneGraph } from '../canvas/scene-graph/provider'
import { useComments } from '../comments/provider'
import { serializeSceneGraph } from '../scene-graph/storage'
import { Pre } from '../typography/Pre'
import { Text } from '../typography'

interface SaveAsDefaultModalProps {
  open: boolean
  onClose: () => void
  onCopy?: () => void
}

function escapeUnicode(json: string): string {
  return json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function SaveAsDefaultModal({ open, onClose, onCopy }: SaveAsDefaultModalProps) {
  const sg = useSceneGraph()
  const { store: commentsStore, threads } = useComments()
  const [copiedScene, setCopiedScene] = useState(false)
  const [copiedComments, setCopiedComments] = useState(false)

  const manager = Modal.useModal({
    open,
    onClose,
  })

  const sceneJson = useMemo(() => {
    if (!open) return ''
    return escapeUnicode(JSON.stringify(serializeSceneGraph(sg), null, 2))
  }, [open, sg])

  const commentsJson = useMemo(() => {
    if (!open) return ''
    return escapeUnicode(JSON.stringify({ version: 1, threads: commentsStore.getSnapshot() }, null, 2))
  }, [open, commentsStore])

  const hasComments = threads.length > 0

  const handleCopyScene = async () => {
    await navigator.clipboard.writeText(sceneJson)
    setCopiedScene(true)
    onCopy?.()
    setTimeout(() => setCopiedScene(false), 2000)
  }

  const handleCopyComments = async () => {
    await navigator.clipboard.writeText(commentsJson)
    setCopiedComments(true)
    onCopy?.()
    setTimeout(() => setCopiedComments(false), 2000)
  }

  return (
    <Modal.Root manager={manager} width="lg">
      <Modal.Contents>
        <Modal.Header>
          <Modal.Title>Save as prototype default</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3 flex flex-col gap-3">
          <Text>
            Download or copy these files into your prototype&apos;s{' '}
            <code className="bg-bg-secondary px-1 rounded">src/defaults/</code> folder
            to update its initial state.
          </Text>

          <div className="flex flex-col gap-1">
            <Text strong>default-scene.json</Text>
            <Pre syntax="json" className="max-h-[150px] overflow-auto">
              {sceneJson}
            </Pre>
            <div className="flex gap-2 mt-1">
              <Button
                variant="secondary"

                iconPrefix={copiedScene ? <Icon24Check /> : <Icon24Clipboard />}
                onClick={handleCopyScene}
              >
                {copiedScene ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="secondary"

                iconPrefix={<Icon24Download />}
                onClick={() => downloadJson(sceneJson, 'default-scene.json')}
              >
                Download
              </Button>
            </div>
          </div>

          {hasComments && (
            <div className="flex flex-col gap-1">
              <Text strong>default-comments.json</Text>
              <Pre syntax="json" className="max-h-[150px] overflow-auto">
                {commentsJson}
              </Pre>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="secondary"
  
                  iconPrefix={copiedComments ? <Icon24Check /> : <Icon24Clipboard />}
                  onClick={handleCopyComments}
                >
                  {copiedComments ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="secondary"
  
                  iconPrefix={<Icon24Download />}
                  onClick={() => downloadJson(commentsJson, 'default-comments.json')}
                >
                  Download
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Modal.ActionStrip>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </Modal.ActionStrip>
        </Modal.Footer>
      </Modal.Contents>
    </Modal.Root>
  )
}

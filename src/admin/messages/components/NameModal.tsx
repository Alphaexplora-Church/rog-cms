import { Button, Field, Modal, Typography } from '@strapi/design-system'
import { useEffect, useState } from 'react'

/**
 * The small "Add New +" popup (Jude, 2026-09-24): one field, Save | Cancel.
 * "Speaker Name:", "Topic:", "Scripture book:".
 *
 * Save creates the record in the CMS right away, so it is searchable in the
 * picker the moment the popup closes — and in every later message.
 */
export function NameModal({
  open,
  title,
  fieldLabel,
  placeholder,
  initialValue,
  existing,
  onCancel,
  onSave,
}: {
  open: boolean
  title: string
  fieldLabel: string
  placeholder?: string
  initialValue: string
  /** Labels already in the CMS, to catch a duplicate before it's created. */
  existing: string[]
  onCancel: () => void
  onSave: (value: string) => Promise<void>
}) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(initialValue)
      setError(undefined)
      setSaving(false)
    }
  }, [open, initialValue])

  const submit = async () => {
    const v = value.trim().replace(/\s+/g, ' ')
    if (!v) return setError('Please type a name.')
    const dupe = existing.find((e) => e.toLowerCase() === v.toLowerCase())
    if (dupe) return setError(`“${dupe}” is already in the list — close this and pick it there.`)
    setSaving(true)
    setError(undefined)
    try {
      await onSave(v)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal.Root open={open} onOpenChange={(o) => !o && !saving && onCancel()}>
      <Modal.Content style={{ maxWidth: 440 }}>
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void submit()
          }}
        >
          <Modal.Body>
            <Field.Root name="quick-create" error={error} required>
              <Field.Label>{fieldLabel}</Field.Label>
              <Field.Input
                autoFocus
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValue(e.target.value)}
              />
              <Field.Error />
            </Field.Root>
            <Typography variant="pi" textColor="neutral600" tag="p" style={{ marginTop: 8 }}>
              Saved straight to the CMS — you’ll find it in the list from now on.
            </Typography>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  )
}

import { Button, Dialog, Flex, IconButton, Typography } from '@strapi/design-system'
import { Trash } from '@strapi/icons'
import { useState } from 'react'

/**
 * The trash button beside Edit on every Manage Contents list (Media
 * Library, Events, Ministries) — Jude, 2026-09-29: "lagyan mo ng delete
 * button … katabi nalang nung edit button".
 *
 * Always asks first: deleting removes the entry from the website right
 * away and can't be undone from here. The dialog stays open (with the
 * button spinning) until the delete actually finishes, and shows the
 * error inside the dialog if it fails, so nothing looks deleted that
 * isn't.
 *
 * Uploaded pictures/videos stay in the Media Library — only the entry
 * itself is removed.
 */
export function DeleteButton({
  name,
  kind,
  onDelete,
  describeError,
}: {
  /** What the editor sees the entry as, e.g. the event name. */
  name: string
  /** "event", "message", "ministry" — used in the dialog title. */
  kind: string
  onDelete: () => Promise<void>
  describeError: (e: unknown) => string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const confirm = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await onDelete()
      setOpen(false)
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <IconButton
        label={`Delete ${name}`}
        variant="ghost"
        onClick={() => {
          setError(undefined)
          setOpen(true)
        }}
      >
        <Trash />
      </IconButton>
      <Dialog.Root open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <Dialog.Content>
          <Dialog.Header>{`Delete this ${kind}?`}</Dialog.Header>
          <Dialog.Body>
            <Flex direction="column" alignItems="center" gap={2}>
              <Typography variant="omega" textAlign="center">
                <Typography fontWeight="bold">{name || `Untitled ${kind}`}</Typography> will be removed from the
                website right away. This can’t be undone.
              </Typography>
              {error ? (
                <Typography variant="pi" textColor="danger600" textAlign="center">
                  {error}
                </Typography>
              ) : null}
            </Flex>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button fullWidth variant="tertiary" disabled={busy}>
                Cancel
              </Button>
            </Dialog.Cancel>
            <Button fullWidth variant="danger-light" startIcon={<Trash />} loading={busy} onClick={confirm}>
              Delete
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  )
}

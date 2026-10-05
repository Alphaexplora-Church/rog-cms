import { Box, Button, Combobox, ComboboxOption, Field, Flex, Modal, Typography } from '@strapi/design-system'
import { Pencil } from '@strapi/icons'
import { useEffect, useState } from 'react'
import type { FileSlot, SeriesTerm } from '../api'
import { FileDrop } from './FileDrop'
import { ADD_NEW, AddNewOption } from './TermPicker'

/**
 * Phase 2, field 1 for the Series category: which series is this episode in.
 *
 * Same search + "Add New +" pattern as Speaker/Topic/Scripture, except a new
 * series takes a cover image as well as a title (Jude, 2026-09-23: "pag mag
 * ccreate siya ng bagong Series, option niya mag upload ng Header para sa
 * cover ng series na yon"). The cover is optional; without one, the website
 * uses the first episode's thumbnail.
 *
 * Once a series is chosen, "Edit series details" opens the same popup
 * filled in — this is where the series' own title and cover are changed
 * (Jude, 2026-09-24: Series details live in the wizard, Phase 2).
 */

function SeriesModal({
  open,
  initial,
  existingTitles,
  onCancel,
  onSave,
}: {
  open: boolean
  initial: { documentId?: string; title: string; cover: FileSlot | null }
  existingTitles: string[]
  onCancel: () => void
  onSave: (v: { documentId?: string; title: string; cover: FileSlot | null }) => Promise<void>
}) {
  const [title, setTitle] = useState(initial.title)
  const [cover, setCover] = useState<FileSlot | null>(initial.cover)
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(initial.title)
      setCover(initial.cover)
      setError(undefined)
      setFormError(undefined)
      setSaving(false)
    }
  }, [open, initial])

  const editing = !!initial.documentId

  const submit = async () => {
    const t = title.trim().replace(/\s+/g, ' ')
    if (!t) return setError('Please type the series title.')
    const dupe = existingTitles.find((e) => e.toLowerCase() === t.toLowerCase())
    if (dupe && (!editing || dupe.toLowerCase() !== initial.title.toLowerCase()))
      return setError(`“${dupe}” already exists — close this and pick it from the list.`)
    if (cover?.file && cover.file.size > 200 * 1024 * 1024) return setFormError('That image is over 200 MB.')
    setSaving(true)
    setError(undefined)
    setFormError(undefined)
    try {
      await onSave({ documentId: initial.documentId, title: t, cover })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Couldn’t save the series. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal.Root open={open} onOpenChange={(o) => !o && !saving && onCancel()}>
      <Modal.Content style={{ maxWidth: 560 }}>
        <Modal.Header>
          <Modal.Title>{editing ? 'Edit series details' : 'New series'}</Modal.Title>
        </Modal.Header>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void submit()
          }}
        >
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={5}>
              <Field.Root name="series-title" error={error} required>
                <Field.Label>Series title</Field.Label>
                <Field.Input
                  autoFocus
                  value={title}
                  placeholder="e.g. I AM"
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Field.Error />
              </Field.Root>
              <FileDrop
                kind="image"
                label="Cover image (optional)"
                hint="Shown on the series card and at the top of the series page. Wide images work best (about 16:9)."
                value={cover}
                onChange={setCover}
              />
              {formError ? (
                <Typography variant="pi" textColor="danger600" role="alert">
                  {formError}
                </Typography>
              ) : null}
              {editing ? (
                <Typography variant="pi" textColor="neutral600">
                  Changes to the series show on the website as soon as you save — for every episode in it.
                </Typography>
              ) : null}
            </Flex>
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

const EMPTY_SERIES = { title: '', cover: null }

export function SeriesField({
  options,
  value,
  onChange,
  onSave,
  error,
}: {
  options: SeriesTerm[]
  value: SeriesTerm | null
  onChange: (v: SeriesTerm | null) => void
  onSave: (v: { documentId?: string; title: string; cover: FileSlot | null }) => Promise<SeriesTerm>
  error?: string
}) {
  const [text, setText] = useState(value?.label ?? '')
  const [modal, setModal] = useState<{
    open: boolean
    initial: { documentId?: string; title: string; cover: FileSlot | null }
  }>({ open: false, initial: EMPTY_SERIES })

  useEffect(() => setText(value?.label ?? ''), [value?.documentId, value?.label])

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Field.Root
        name="series"
        error={error}
        required
        hint="Type to search — for example “I AM” or “Exodus”. Not there yet? Choose “Add New +”."
      >
        <Field.Label>Series</Field.Label>
        <Combobox
          placeholder="Search series…"
          value={value?.documentId ?? ''}
          textValue={text}
          onTextValueChange={setText}
          onChange={(id) => {
            if (id === ADD_NEW) {
              // Leave the typed text alone while the popup is open: changing
              // it re-filters the list under the pointer, and the tail of the
              // same click then lands on whichever series slid into place.
              const typed = text.trim() && text !== value?.label ? text.trim() : ''
              return setModal({ open: true, initial: { title: typed, cover: null } })
            }
            onChange(options.find((o) => o.documentId === id) ?? null)
          }}
          onClear={() => {
            setText('')
            onChange(null)
          }}
          clearLabel="Clear series"
          // "contains", not Strapi's default "starts with": typing "chito"
          // has to find "Bp. Chito Sanchez".
          autocomplete={{ type: 'list', filter: 'contains' }}
        >
          {options.map((o) => (
            <ComboboxOption key={o.documentId} value={o.documentId}>
              {o.label}
            </ComboboxOption>
          ))}
          <AddNewOption text={text !== value?.label ? text : ''} />
        </Combobox>
        <Field.Hint />
        <Field.Error />
      </Field.Root>

      {value ? (
        <Box background="neutral100" hasRadius padding={3}>
          <Flex gap={4} alignItems="center">
            <Box
              width="96px"
              height="54px"
              hasRadius
              overflow="hidden"
              background="neutral200"
              style={{ flex: '0 0 auto' }}
            >
              {value.cover?.url ? (
                <img src={value.cover.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </Box>
            <Flex direction="column" alignItems="flex-start" gap={1} style={{ flex: 1, minWidth: 0 }}>
              <Typography variant="omega" fontWeight="bold" ellipsis>
                {value.label}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {value.cover ? 'Has a cover image' : 'No cover yet — the first episode’s thumbnail is used'}
              </Typography>
            </Flex>
            <Button
              size="S"
              variant="tertiary"
              startIcon={<Pencil />}
              onClick={() =>
                setModal({
                  open: true,
                  initial: {
                    documentId: value.documentId,
                    title: value.label,
                    cover: value.cover ? { existing: value.cover } : null,
                  },
                })
              }
            >
              Edit series details
            </Button>
          </Flex>
        </Box>
      ) : null}

      <SeriesModal
        open={modal.open}
        initial={modal.initial}
        existingTitles={options.map((o) => o.label)}
        onCancel={() => {
          setModal({ open: false, initial: EMPTY_SERIES })
          setText(value?.label ?? '')
        }}
        onSave={async (v) => {
          const saved = await onSave(v)
          setModal({ open: false, initial: EMPTY_SERIES })
          onChange(saved)
        }}
      />
    </Flex>
  )
}

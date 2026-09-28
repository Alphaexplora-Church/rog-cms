import { Box, Combobox, ComboboxOption, Field, Flex, Tag } from '@strapi/design-system'
import { Cross, Plus } from '@strapi/icons'
import { useState } from 'react'
import type { Term } from '../api'
import { NameModal } from './NameModal'

/**
 * "Add New +" is an ordinary last option with a reserved value, not the
 * design system's built-in `creatable` row. That row, when clicked, ALSO
 * selected the first real option (found in a browser test: adding the topic
 * "Pea" silently tagged "Faith" as well). A plain option has no such side
 * effect.
 *
 * Its filter text is whatever has been typed, so it survives the "contains"
 * filter and is always the last row. It is keyed by that text because the
 * underlying primitive reads an option's filter text only when it mounts.
 */
export const ADD_NEW = '__rog_add_new__'

export function AddNewOption({ text }: { text: string }) {
  const t = text.trim()
  return (
    <ComboboxOption key={`add-${text}`} value={ADD_NEW} textValue={text}>
      <Flex gap={2} tag="span">
        <Plus aria-hidden width="1.2rem" height="1.2rem" />
        <span style={{ fontWeight: 600 }}>{t ? `Add New + “${t}”` : 'Add New +'}</span>
      </Flex>
    </ComboboxOption>
  )
}

/**
 * Search-as-you-type picker with "Add New +" (Jude, 2026-09-24):
 *
 *   "Ttype ko nalang sa Field ay Chito Sanchez, tapos may lalabas na
 *    dropdown (Bp. Chito Sanchez) or any similar na existing… tapos dapat
 *    sa dropdown, nakalagay 'Add New +'"
 *
 * Typing filters the existing records (so "chito" finds "Bp. Chito
 * Sanchez"). The last row of the dropdown is always "Add New +", which opens
 * the small NameModal pre-filled with whatever was typed. Saving there
 * creates the record and selects it.
 *
 * `multiple` is for Topics — a message can have several — shown as removable
 * tags under the field. Speaker and Scripture are one each.
 */

type Common = {
  label: string
  placeholder: string
  hint?: string
  error?: string
  required?: boolean
  options: Term[]
  /** Shown as the NameModal's title and field label. */
  addTitle: string
  addFieldLabel: string
  onCreate: (label: string) => Promise<Term>
}

type Single = Common & { multiple?: false; value: Term | null; onChange: (v: Term | null) => void }
type Multi = Common & { multiple: true; value: Term[]; onChange: (v: Term[]) => void }

export function TermPicker(props: Single | Multi) {
  const { label, placeholder, hint, error, required, options, addTitle, addFieldLabel, onCreate } = props

  const selectedSingle = !props.multiple ? props.value : null
  const selectedMany = props.multiple ? props.value : []

  const [text, setText] = useState(selectedSingle?.label ?? '')
  const [modal, setModal] = useState<{ open: boolean; initial: string }>({ open: false, initial: '' })

  const isPicked = (o: Term) => selectedMany.some((s) => s.documentId === o.documentId)

  // Picked topics STAY in the dropdown (marked ✓) rather than dropping out.
  // Removing the row under the pointer made the next row — "Add New +" —
  // slide under it and catch the same click (found in a browser test).
  const available = options

  const select = (documentId: string | undefined) => {
    const term = options.find((o) => o.documentId === documentId)
    if (props.multiple) {
      if (term && !isPicked(term)) props.onChange([...selectedMany, term])
      // The combobox writes the picked label into the box after this
      // handler runs; clear it on the next frame so the box is ready for
      // the next topic.
      requestAnimationFrame(() => setText(''))
    } else {
      props.onChange(term ?? null)
      setText(term?.label ?? '')
    }
  }

  const created = (term: Term) => {
    if (props.multiple) {
      props.onChange([...selectedMany, term])
      requestAnimationFrame(() => setText(''))
    } else {
      props.onChange(term)
      setText(term.label)
    }
  }

  return (
    <Field.Root name={label} error={error} hint={hint} required={required}>
      <Field.Label>{label}</Field.Label>
      <Combobox
        placeholder={placeholder}
        value={props.multiple ? '' : (selectedSingle?.documentId ?? '')}
        textValue={text}
        onTextValueChange={setText}
        onChange={(v) => {
          if (v === ADD_NEW) return setModal({ open: true, initial: text.trim() })
          select(v)
        }}
        onClear={() => {
          setText('')
          if (!props.multiple) props.onChange(null)
        }}
        clearLabel={`Clear ${label.toLowerCase()}`}
        // "contains", not Strapi's default "starts with": typing "chito"
        // has to find "Bp. Chito Sanchez".
        autocomplete={{ type: 'list', filter: 'contains' }}
      >
        {available.map((o) => (
          <ComboboxOption key={o.documentId} value={o.documentId}>
            {props.multiple && isPicked(o) ? `${o.label}  ✓` : o.label}
          </ComboboxOption>
        ))}
        <AddNewOption text={text} />
      </Combobox>
      <Field.Hint />
      <Field.Error />

      {props.multiple && selectedMany.length > 0 ? (
        <Box paddingTop={2}>
          <Flex gap={2} wrap="wrap">
            {selectedMany.map((t) => (
              <Tag
                key={t.documentId}
                icon={<Cross />}
                label={`Remove ${t.label}`}
                onClick={() => props.onChange(selectedMany.filter((s) => s.documentId !== t.documentId))}
              >
                {t.label}
              </Tag>
            ))}
          </Flex>
        </Box>
      ) : null}

      <NameModal
        open={modal.open}
        title={addTitle}
        fieldLabel={addFieldLabel}
        initialValue={modal.initial}
        existing={options.map((o) => o.label)}
        onCancel={() => setModal({ open: false, initial: '' })}
        onSave={async (v) => {
          const term = await onCreate(v)
          setModal({ open: false, initial: '' })
          created(term)
        }}
      />
    </Field.Root>
  )
}

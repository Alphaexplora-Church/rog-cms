import { Alert, Box, Button, Flex, Link, Loader, Typography } from '@strapi/design-system'
import { ArrowLeft, ArrowRight, Check } from '@strapi/icons'
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  EMPTY_DRAFT,
  TYPE_LABEL,
  errorMessage,
  loadMinistry,
  publishMinistry,
  type MinistryDraft,
  type MinistryType,
  type PublishStep,
} from './api'
import { Stepper } from '../messages/components/Stepper'
import { validateDetails, validateType, type Errors } from './rules'
import { TypeStep } from './steps/TypeStep'
import { DetailsStep } from './steps/DetailsStep'
import { SummaryStep } from './steps/SummaryStep'

/**
 * The Ministries wizard (Jude, 2026-09-28):
 *
 *   Manage Contents > Ministries > New Ministry / Edit Ministry
 *     Phase 1  Type      — Ages of the River / Service Ministries /
 *                          Body of Christ Ministries
 *     Phase 2  Details   — the forms for that type (DetailsStep.tsx)
 *     Phase 3  Summary   — preview, Edit to fix, Publish
 *
 * Same Stepper and FileDrop as the Media Library and Events wizards
 * (imported from ../messages/, not copied). Editing opens straight on
 * Phase 2, like the Media Library ("rekta na siya sa Phase 2"); Phase 1 is
 * still one click back if the type needs changing.
 *
 * Every navigate('..') is relative — this is mounted one level under its
 * own list, wherever the section itself is mounted.
 */

const STEPS = [
  { label: 'Type', hint: 'Which kind of ministry' },
  { label: 'Details', hint: 'Name, description…' },
  { label: 'Summary', hint: 'Check, then publish' },
]

const PUBLISH_LABEL: Record<PublishStep, string> = {
  photo: 'Uploading the cover photo…',
  saving: 'Publishing…',
}

export default function Wizard() {
  const { documentId } = useParams<{ documentId?: string }>()
  const editing = !!documentId
  const client = useFetchClient()
  const { toggleNotification } = useNotification()
  const navigate = useNavigate()
  const top = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string>()
  const [draft, setDraft] = useState<MinistryDraft>(EMPTY_DRAFT)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [publishing, setPublishing] = useState<PublishStep | null>(null)
  const [serverError, setServerError] = useState<string>()
  const [dirty, setDirty] = useState(false)

  /* ── load ─────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(undefined)
    try {
      if (documentId) {
        setDraft(await loadMinistry(client, documentId))
        setStep(1)
        setReached(2)
      } else {
        setDraft(EMPTY_DRAFT)
        setStep(0)
        setReached(0)
      }
    } catch (e) {
      setLoadError(errorMessage(e))
    } finally {
      setLoading(false)
    }
    // `client` is a new object every render; loading once per ministry is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const patch = (p: Partial<MinistryDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    setDirty(true)
    setServerError(undefined)
  }

  const go = (i: number) => {
    setStep(i)
    setReached((r) => Math.max(r, i))
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  const errors: Errors = showErrors ? (step === 0 ? validateType(draft) : validateDetails(draft)) : {}

  const blockOn = (found: Errors) => {
    if (!Object.keys(found).length) return false
    setShowErrors(true)
    requestAnimationFrame(() => {
      const el = top.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (el && 'focus' in el) el.focus({ preventScroll: true })
    })
    return true
  }

  const next = () => {
    if (step === 0) {
      if (blockOn(validateType(draft))) return
      setShowErrors(false)
      return go(1)
    }
    if (step === 1) {
      if (blockOn(validateDetails(draft))) return
      return go(2)
    }
  }

  // Picking a type doesn't jump ahead on its own — arrow keys move through
  // the choices, same as the Media Library's Category step. Next moves on.
  const chooseType = (t: MinistryType) => {
    patch({ ministryType: t })
    setShowErrors(false)
  }

  /* ── publish ──────────────────────────────────────────────────────── */
  const publish = async () => {
    if (Object.keys(validateType(draft)).length) {
      setShowErrors(true)
      return go(0)
    }
    if (Object.keys(validateDetails(draft)).length) {
      setShowErrors(true)
      return go(1)
    }
    setServerError(undefined)
    setPublishing('saving')
    try {
      await publishMinistry(client, draft, setPublishing)
      setDirty(false)
      toggleNotification({
        type: 'success',
        title: editing ? 'Changes published' : 'Published',
        message: `“${draft.name.trim()}” is live on the website’s Ministries page.`,
      })
      navigate('..')
    } catch (e) {
      setServerError(errorMessage(e))
      setPublishing(null)
    }
  }

  /* ── render ───────────────────────────────────────────────────────── */
  const title = editing ? 'Edit Ministry' : 'New Ministry'
  const confirmLeave = () =>
    !dirty || window.confirm('Leave without publishing? Your changes on this page will be lost.')

  if (loading) {
    return (
      <Page.Main>
        <Page.Title>{title}</Page.Title>
        <Flex justifyContent="center" padding={11}>
          <Loader>Loading…</Loader>
        </Flex>
      </Page.Main>
    )
  }

  if (loadError) {
    return (
      <Page.Main>
        <Page.Title>{title}</Page.Title>
        <Layouts.Header title={title} />
        <Layouts.Content>
          <Alert variant="danger" title="Couldn’t load" closeLabel="Close" onClose={() => navigate('..')}>
            {loadError}
          </Alert>
          <Box paddingTop={4}>
            <Button onClick={() => void load()}>Try again</Button>
          </Box>
        </Layouts.Content>
      </Page.Main>
    )
  }

  const errorCount = Object.keys(errors).length

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>
      <Layouts.Header
        title={title}
        subtitle={
          editing
            ? `${draft.ministryType ? TYPE_LABEL[draft.ministryType] : 'Ministry'} — change anything, check the Summary, and publish.`
            : 'Three short phases. Nothing goes live until you press Publish.'
        }
        navigationAction={
          <Link
            tag={NavLink}
            to=".."
            startIcon={<ArrowLeft />}
            onClick={(e: React.MouseEvent) => {
              if (!confirmLeave()) e.preventDefault()
            }}
          >
            All Ministries
          </Link>
        }
        primaryAction={
          <Button variant="tertiary" onClick={() => confirmLeave() && navigate('..')}>
            Cancel
          </Button>
        }
      />
      <Layouts.Content>
        <div ref={top} style={{ scrollMarginTop: 80 }}>
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Stepper steps={STEPS} current={step} reached={reached} onGo={go} />

            {step === 0 ? <TypeStep value={draft.ministryType} onChange={chooseType} error={errors.ministryType} /> : null}
            {step === 1 ? <DetailsStep draft={draft} patch={patch} errors={errors} /> : null}
            {step === 2 ? <SummaryStep draft={draft} onEditType={() => go(0)} onEditDetails={() => go(1)} /> : null}

            {serverError ? (
              <Alert variant="danger" title="Not published" closeLabel="Dismiss" onClose={() => setServerError(undefined)}>
                {serverError}
              </Alert>
            ) : null}

            {showErrors && step === 1 && errorCount ? (
              <Typography variant="omega" textColor="danger600" role="status">
                {errorCount === 1
                  ? 'One thing needs fixing before you can continue.'
                  : `${errorCount} things need fixing before you can continue.`}
              </Typography>
            ) : null}

            <Box
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              paddingTop={4}
              paddingBottom={4}
              paddingLeft={6}
              paddingRight={6}
              style={{ position: 'sticky', bottom: 16, zIndex: 2 }}
            >
              <Flex justifyContent="space-between" gap={3}>
                <Button
                  variant="tertiary"
                  size="L"
                  startIcon={<ArrowLeft />}
                  disabled={step === 0 || !!publishing}
                  onClick={() => go(step - 1)}
                >
                  Back
                </Button>
                <Typography variant="pi" textColor="neutral600">
                  {`Phase ${step + 1} of ${STEPS.length}`}
                </Typography>
                {step < 2 ? (
                  <Button size="L" endIcon={<ArrowRight />} onClick={next}>
                    Next
                  </Button>
                ) : (
                  <Button size="L" startIcon={<Check />} loading={!!publishing} onClick={() => void publish()}>
                    {publishing ? PUBLISH_LABEL[publishing] : editing ? 'Publish changes' : 'Publish'}
                  </Button>
                )}
              </Flex>
            </Box>
          </Flex>
        </div>
      </Layouts.Content>
    </Page.Main>
  )
}

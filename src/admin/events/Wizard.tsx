import { Alert, Box, Button, Flex, Link, Loader, Typography } from '@strapi/design-system'
import { ArrowLeft, ArrowRight, Check } from '@strapi/icons'
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { EMPTY_DRAFT, errorMessage, loadEvent, publishEvent, type EventDraft, type PublishStep } from './api'
import { Stepper } from '../messages/components/Stepper'
import { validateContents, type Errors } from './rules'
import { ContentStep } from './steps/ContentStep'
import { ReviewStep } from './steps/ReviewStep'

/**
 * The event wizard — same Stepper/FileDrop components as the Media Library
 * wizard (imported from ../messages/, not copied), but only two phases:
 * no category choice (Jude, 2026-09-24: "sa Phase 1, rekta forms na agad").
 *
 *   Phase 1  Contents   — the five fields
 *   Phase 2  Review     — preview, Edit to fix, Publish
 *
 * The back link and the post-publish redirect both navigate('..') rather
 * than a hardcoded path — this file is mounted one level under its own
 * list (at "new" or ":documentId"), so ".." always lands back on that list
 * regardless of where the whole section is mounted.
 */

const STEPS = [
  { label: 'Contents', hint: 'Name, date, time…' },
  { label: 'Review', hint: 'Check, then publish' },
]

const PUBLISH_LABEL: Record<PublishStep, string> = {
  photo: 'Uploading the header photo…',
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

  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT)
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
        const saved = await loadEvent(client, documentId)
        setDraft(saved)
        setStep(0)
        setReached(1)
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
    // `client` is a new object every render; loading once per event is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  useEffect(() => {
    void load()
  }, [load])

  // Closing the tab with unsaved work asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const patch = (p: Partial<EventDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    setDirty(true)
    setServerError(undefined)
  }

  const go = (i: number) => {
    setStep(i)
    setReached((r) => Math.max(r, i))
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  const errors: Errors = showErrors ? validateContents(draft) : {}

  const next = () => {
    if (step === 0) {
      const found = validateContents(draft)
      if (Object.keys(found).length) {
        setShowErrors(true)
        requestAnimationFrame(() => {
          const el = top.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          if (el && 'focus' in el) el.focus({ preventScroll: true })
        })
        return
      }
      return go(1)
    }
  }

  /* ── publish ──────────────────────────────────────────────────────── */
  const publish = async () => {
    const found = validateContents(draft)
    if (Object.keys(found).length) {
      setShowErrors(true)
      return go(0)
    }
    setServerError(undefined)
    setPublishing('saving')
    try {
      await publishEvent(client, draft, setPublishing)
      setDirty(false)
      toggleNotification({
        type: 'success',
        title: editing ? 'Changes published' : 'Published',
        message: `“${draft.eventName.trim()}” is live on the website.`,
      })
      navigate('..')
    } catch (e) {
      setServerError(errorMessage(e))
      setPublishing(null)
    }
  }

  /* ── render ───────────────────────────────────────────────────────── */
  const title = editing ? 'Edit event' : 'New Event'

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

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>
      <Layouts.Header
        title={title}
        subtitle={
          editing
            ? 'Change anything below, check it on Review, and publish.'
            : 'Two short phases. Nothing goes live until you press Publish.'
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
            All Events
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

            {step === 0 ? <ContentStep draft={draft} patch={patch} errors={errors} /> : null}

            {step === 1 ? <ReviewStep draft={draft} onEditDetails={() => go(0)} /> : null}

            {serverError ? (
              <Alert variant="danger" title="Not published" closeLabel="Dismiss" onClose={() => setServerError(undefined)}>
                {serverError}
              </Alert>
            ) : null}

            {showErrors && step === 0 && Object.keys(errors).length ? (
              <Typography variant="omega" textColor="danger600" role="status">
                {Object.keys(errors).length === 1
                  ? 'One thing needs fixing before you can continue.'
                  : `${Object.keys(errors).length} things need fixing before you can continue.`}
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
                {step < 1 ? (
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

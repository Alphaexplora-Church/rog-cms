import { Alert, Box, Button, Flex, Link, Loader, Typography } from '@strapi/design-system'
import { ArrowLeft, ArrowRight, Check } from '@strapi/icons'
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  createTerm,
  EMPTY_DRAFT,
  errorMessage,
  loadMessage,
  loadSeries,
  loadTerms,
  publishMessage,
  saveSeries,
  type FileSlot,
  type MessageDraft,
  type PublishStep,
  type SeriesTerm,
  type Term,
  type TermKind,
} from './api'
import { Stepper } from './components/Stepper'
import { validateContents, type Errors } from './rules'
import { CategoryStep } from './steps/CategoryStep'
import { ContentStep } from './steps/ContentStep'
import { ReviewStep } from './steps/ReviewStep'

/**
 * The message wizard (Jude, 2026-09-24). Lives inside "Manage Contents" as
 * "Media Library" (moved there, and renamed for the client, 2026-09-24 —
 * see ../manage-contents/ManageContentsPage.tsx for the URL layout).
 *
 *   Phase 1  Category   — Series or Sermon
 *   Phase 2  Contents   — the fields for that category
 *   Phase 3  Review     — preview, Back/Edit to fix, Publish
 *
 * Editing an existing message opens straight on Phase 2 with everything
 * filled in, then Phase 3 — "same nalang siya sa phasing pag mag ccreate ng
 * new. pero rekta na siya sa Phase 2."
 *
 * The back link and the post-publish redirect both navigate('..') rather
 * than to a hardcoded path — this file is mounted one level under its own
 * list (at "new" or ":documentId"), so ".." always lands back on that list
 * regardless of where the whole section is mounted.
 *
 * Client-facing labels, both changed 2026-09-24 to match the "Media
 * Library" rename: the back link reads "All Media" (was "All messages"),
 * and the new-entry title/tab reads "New Media" (was "New message" — the
 * edit title stayed "Edit message", not asked to change). Also added that
 * day: a Cancel button in the header's upper right, same unsaved-work
 * confirm as the back link, on both /new and the edit page — see
 * confirmLeave() below, shared by both.
 */

const STEPS = [
  { label: 'Category', hint: 'Series or Sermon' },
  { label: 'Contents', hint: 'Title, video, speaker…' },
  { label: 'Review', hint: 'Check, then publish' },
]

const PUBLISH_LABEL: Record<PublishStep, string> = {
  video: 'Uploading the video…',
  thumbnail: 'Uploading the thumbnail…',
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
  const [series, setSeries] = useState<SeriesTerm[]>([])
  const [terms, setTerms] = useState<Record<TermKind, Term[]>>({ speaker: [], topic: [], scripture: [] })

  const [draft, setDraft] = useState<MessageDraft>(EMPTY_DRAFT)
  const [original, setOriginal] = useState<MessageDraft | null>(null)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [categoryError, setCategoryError] = useState<string>()
  const [publishing, setPublishing] = useState<PublishStep | null>(null)
  const [serverError, setServerError] = useState<string>()
  const [dirty, setDirty] = useState(false)

  /* ── load ─────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(undefined)
    try {
      const [seriesList, speaker, topic, scripture] = await Promise.all([
        loadSeries(client),
        loadTerms(client, 'speaker'),
        loadTerms(client, 'topic'),
        loadTerms(client, 'scripture'),
      ])
      setSeries(seriesList)
      setTerms({ speaker, topic, scripture })

      if (documentId) {
        const saved = await loadMessage(client, documentId, seriesList)
        setDraft(saved)
        setOriginal(saved)
        setStep(1)
        setReached(2)
      } else {
        setDraft(EMPTY_DRAFT)
        setOriginal(null)
        setStep(0)
        setReached(0)
      }
    } catch (e) {
      setLoadError(errorMessage(e))
    } finally {
      setLoading(false)
    }
    // `client` is a new object every render; loading once per message is the intent.
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

  const patch = (p: Partial<MessageDraft>) => {
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
      if (!draft.category) return setCategoryError('Choose Series or Sermon to continue.')
      setCategoryError(undefined)
      return go(1)
    }
    if (step === 1) {
      const found = validateContents(draft)
      if (Object.keys(found).length) {
        setShowErrors(true)
        // Take the editor to the first problem, not just the top of the page.
        requestAnimationFrame(() => {
          const el = top.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          if (el && 'focus' in el) el.focus({ preventScroll: true })
        })
        return
      }
      return go(2)
    }
  }

  /* ── quick-creates from Phase 2 ───────────────────────────────────── */
  const onCreateTerm = async (kind: TermKind, label: string) => {
    try {
      const term = await createTerm(client, kind, label)
      setTerms((t) => ({
        ...t,
        [kind]: [...t[kind], term].sort((a, b) => a.label.localeCompare(b.label)),
      }))
      toggleNotification({ type: 'success', message: `“${term.label}” added.` })
      return term
    } catch (e) {
      throw new Error(errorMessage(e))
    }
  }

  const onSaveSeries = async (v: { documentId?: string; title: string; cover: FileSlot | null }) => {
    try {
      const saved = await saveSeries(client, v)
      setSeries((list) => {
        const rest = list.filter((s) => s.documentId !== saved.documentId)
        return [...rest, saved].sort((a, b) => a.label.localeCompare(b.label))
      })
      toggleNotification({
        type: 'success',
        message: v.documentId ? `Series “${saved.label}” updated.` : `Series “${saved.label}” created.`,
      })
      return saved
    } catch (e) {
      throw new Error(errorMessage(e))
    }
  }

  /* ── publish ──────────────────────────────────────────────────────── */
  const publish = async () => {
    const found = validateContents(draft)
    if (Object.keys(found).length) {
      setShowErrors(true)
      return go(1)
    }
    setServerError(undefined)
    setPublishing('saving')
    try {
      await publishMessage(client, draft, original, setPublishing)
      setDirty(false)
      toggleNotification({
        type: 'success',
        title: editing ? 'Changes published' : 'Published',
        message: `“${draft.title.trim()}” is live on the website.`,
      })
      navigate('..')
    } catch (e) {
      setServerError(errorMessage(e))
      setPublishing(null)
    }
  }

  /* ── render ───────────────────────────────────────────────────────── */
  const title = editing ? 'Edit message' : 'New Media'

  // Shared by the back link and the Cancel button (Jude, 2026-09-24: put a
  // Cancel in the upper right on both /new and the edit page) — same
  // unsaved-work confirm either way, just two different triggers for it.
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
            All Media
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

            {step === 0 ? (
              <CategoryStep
                value={draft.category}
                onChange={(c) => {
                  // A different category means a different set of fields;
                  // don't greet the editor with the old set's errors.
                  if (c !== draft.category) setShowErrors(false)
                  patch({ category: c })
                  setCategoryError(undefined)
                }}
                error={categoryError}
              />
            ) : null}

            {step === 1 ? (
              <ContentStep
                draft={draft}
                patch={patch}
                errors={errors}
                series={series}
                terms={terms}
                onSaveSeries={onSaveSeries}
                onCreateTerm={onCreateTerm}
              />
            ) : null}

            {step === 2 ? (
              <ReviewStep draft={draft} onEditCategory={() => go(0)} onEditDetails={() => go(1)} />
            ) : null}

            {serverError ? (
              <Alert variant="danger" title="Not published" closeLabel="Dismiss" onClose={() => setServerError(undefined)}>
                {serverError}
              </Alert>
            ) : null}

            {showErrors && step === 1 && Object.keys(errors).length ? (
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

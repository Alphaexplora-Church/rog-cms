import { Box, Button, Flex, Typography } from '@strapi/design-system'
import { CloudUpload, Trash } from '@strapi/icons'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { styled } from 'styled-components'
import type { FileSlot } from '../api'

/**
 * "Drop your video file here" — and the thumbnail drop beside it.
 *
 * Nothing uploads when a file is dropped. The file is held in the form and
 * previewed from this computer; it uploads only when the editor presses
 * Publish on the Review phase. Abandoning the wizard therefore never leaves
 * a stray 150 MB video in the Media Library.
 */

const Zone = styled.div<{ $over: boolean; $invalid: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spaces[2]};
  min-height: 168px;
  padding: ${({ theme }) => theme.spaces[6]};
  text-align: center;
  border-radius: 12px;
  border: 1.5px dashed
    ${({ theme, $over, $invalid }) =>
      $over ? theme.colors.primary600 : $invalid ? theme.colors.danger600 : theme.colors.neutral300};
  background: ${({ theme, $over }) => ($over ? theme.colors.primary100 : theme.colors.neutral100)};
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary600};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }

  svg {
    width: 28px;
    height: 28px;
    fill: ${({ theme }) => theme.colors.primary600};
  }
`

const Hidden = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`

const Preview = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;

  img,
  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function FileDrop({
  kind,
  label,
  hint,
  value,
  onChange,
  error,
  required,
  fallbackSrc,
  fallbackNote,
}: {
  kind: 'video' | 'image'
  label: string
  hint?: string
  value: FileSlot | null
  onChange: (v: FileSlot | null) => void
  error?: string
  required?: boolean
  /** Shown when the slot is empty but something stands in for it — the
   *  series cover for a series episode without its own thumbnail. */
  fallbackSrc?: string
  fallbackNote?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const localUrl = useMemo(() => (value?.file ? URL.createObjectURL(value.file) : undefined), [value?.file])
  useEffect(() => () => void (localUrl && URL.revokeObjectURL(localUrl)), [localUrl])

  const src = localUrl ?? value?.existing?.url
  const name = value?.file?.name ?? value?.existing?.name
  const accept = kind === 'video' ? 'video/mp4,video/webm,video/quicktime,video/*' : 'image/png,image/jpeg,image/webp,image/gif'

  const take = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    const ok = kind === 'video' ? f.type.startsWith('video/') : f.type.startsWith('image/')
    if (!ok) return
    onChange({ file: f })
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="pi" fontWeight="bold" textColor="neutral800" tag="span">
        {label}
        {required ? <Typography textColor="danger600"> *</Typography> : null}
      </Typography>

      {src ? (
        <Box>
          <Preview>
            {kind === 'video' ? <video src={src} controls preload="metadata" /> : <img src={src} alt="" />}
          </Preview>
          <Flex paddingTop={2} gap={3} justifyContent="space-between" wrap="wrap">
            <Typography variant="pi" textColor="neutral600" ellipsis style={{ maxWidth: '60%' }}>
              {name}
              {value?.file ? ` · ${formatBytes(value.file.size)}` : ''}
            </Typography>
            <Flex gap={2}>
              <Button size="S" variant="tertiary" onClick={() => input.current?.click()}>
                Replace
              </Button>
              <Button size="S" variant="danger-light" startIcon={<Trash />} onClick={() => onChange(null)}>
                Remove
              </Button>
            </Flex>
          </Flex>
        </Box>
      ) : (
        <Zone
          role="button"
          tabIndex={0}
          aria-label={`${label}: ${kind === 'video' ? 'choose a video file' : 'choose an image'}`}
          aria-describedby={`${id}-msg`}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              input.current?.click()
            }
          }}
          $over={over}
          $invalid={!!error}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            take(e.dataTransfer.files)
          }}
        >
          {fallbackSrc ? (
            <Preview style={{ maxWidth: 280, opacity: 0.85 }}>
              <img src={fallbackSrc} alt="" />
            </Preview>
          ) : (
            <CloudUpload aria-hidden />
          )}
          <Typography variant="omega" fontWeight="semiBold" textColor="neutral800">
            {kind === 'video' ? 'Drop your video file here' : 'Drop your thumbnail image here'}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {fallbackNote ?? 'or click to choose a file'}
          </Typography>
        </Zone>
      )}

      <Hidden
        ref={input}
        type="file"
        tabIndex={-1}
        aria-hidden
        accept={accept}
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />

      <div id={`${id}-msg`}>
        {error ? (
          <Typography variant="pi" textColor="danger600" role="alert">
            {error}
          </Typography>
        ) : hint ? (
          <Typography variant="pi" textColor="neutral600">
            {hint}
          </Typography>
        ) : null}
      </div>
    </Flex>
  )
}

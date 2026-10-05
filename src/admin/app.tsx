import { getFetchClient, type StrapiApp } from '@strapi/strapi/admin'
import { Folder } from '@strapi/icons'
import rogLogo from './extensions/rog-logo.png'
import rogFavicon from './extensions/favicon.png'
import { ROG_WIDGETS, ROG_WIDGET_UIDS } from './dashboard'

/**
 * ROG CMS — admin panel white-label.
 *
 * CREATED 2026-09-23 on Jude's brief: "enhance the WHOLE UI DESIGN which
 * matches doon sa theme nung rog-website-ui… then remove all the unecessary
 * things na hindi naman kailangan makita ni client or gagamitin ni client ng
 * cms."
 *
 * The client logs into this panel every week. It should look like River of
 * God's own tool, not like a Strapi install with a logo dropped on it, and
 * it should not advertise Strapi's products to them.
 *
 * ── WHAT IS SAFE TO STYLE, AND WHAT IS NOT ───────────────────────────────
 * This is the single most important thing to know before editing this file,
 * and it was learned the expensive way during the Alphaexplora POC.
 *
 * Strapi's admin is built with styled-components and ships randomly-hashed
 * class names (`sc-bdvwhi gqBWyv`) that REGENERATE ON EVERY ADMIN REBUILD.
 * CSS written against a class name you copied out of devtools works today
 * and silently dies the next time the admin rebuilds. So nothing in this
 * file targets one.
 *
 * What is stable, and all this file uses:
 *   · The documented `config.theme` colour tokens.
 *   · `config.translations.en` — the same mechanism used to add a language,
 *     pointed at the default locale to replace Strapi's own wording.
 *   · The `#strapi` root id, real HTML tags, browser pseudo-elements and
 *     pseudo-classes, and attribute selectors.
 *   · Elements this file creates itself, which Strapi cannot rebuild away.
 *
 * Deliberately NOT attempted: reshaping Strapi's panels, cards and tables.
 *
 * THE DASHBOARD — this note used to say the default widgets couldn't be
 * removed. That was true of `widgets.register(<widget>)`, which only adds.
 * Strapi 5.53's registry also takes a REDUCER — `register((prev) => next)` —
 * and because plugins register before this file's `register()` runs, the
 * reducer sees the full default list and can replace it. No CSS, no hashed
 * class names: see `register()` below and ./dashboard/index.ts.
 *
 * ── THE PALETTE ──────────────────────────────────────────────────────────
 * Taken from the live site, not approximated. `rog-website-ui` builds on
 * dark plates (#0d0d0d / #161616 / #232323 / black) with #262626 hairlines,
 * #a6a6a6 muted text, and teal #1b7a70 with #8FD4C9 as the single accent
 * hue. Light mode maps to the site's own light plate (#ffffff / #f4f4f4 /
 * #e4e4e4). Figtree is the site's interim face for Proxima Nova; when ROG's
 * Adobe kit lands on the domain, change FONT_STACK here and on the site.
 *
 * ⚠ BOTH THEMES ARE REAL. Strapi follows `prefers-color-scheme` when the
 * user has set no preference, so a light-system user gets Strapi's light
 * panels. The POC shipped a forced dark background and only caught the
 * resulting contrast bug later, because the dev machine happened to be dark.
 * Every rule below that sets a background is either theme-aware or on a
 * surface that is intentionally dark in both themes (the sidebar and the
 * login brand panel — a fixed dark rail is a deliberate identity choice).
 */

const BRAND = {
  /** The one accent hue. Fill colour — white text on it clears AA at 5.1:1. */
  teal: '#1b7a70',
  tealHover: '#22968a',
  tealDeep: '#166059',
  /** Accent for TEXT on a dark plate — #1b7a70 as text on #0d0d0d is only
   *  3.2:1 and fails AA, so anything type-sized uses this instead. */
  tealLight: '#8FD4C9',
} as const

/**
 * ── MESSAGE WIZARD, 2026-09-24, MOVED INSIDE MANAGE CONTENTS 2026-09-24 ──
 * Jude: a progress-bar form instead of Strapi's single long form —
 * Phase 1 Category, Phase 2 Contents, Phase 3 Review. It lives in
 * `./messages/` (folder name kept; only what the client sees changed).
 *
 * Originally its own sidebar entry, "Messages". Same day, Jude asked for a
 * "Manage Contents" hub of "Sections" cards (modelled on Vercel's Projects
 * grid) and for this to move inside it as the first section, renamed
 * "Media Library" — see MANAGE_CONTENTS_PATH below and
 * ./manage-contents/ManageContentsPage.tsx for the resulting URLs. It is no
 * longer registered as its own `addMenuLink` at all.
 *
 * The standard Content Manager form for Sermon still exists underneath (it
 * is Strapi's, and the wizard saves through the same API). To keep the
 * client on ONE way of doing things, opening a sermon there — or pressing
 * its "Create new entry" — is redirected into the wizard. The Content
 * Manager's LIST of sermons is left alone, since bulk delete and
 * unpublish live there.
 *
 * Set this to false to switch the redirect off (e.g. for Alphaexplora to
 * reach the raw form while debugging). The wizard itself stays available.
 */
const REDIRECT_SERMON_FORM_TO_WIZARD = true

const SERMON_FORM_PATH =
  /\/content-manager\/collection-types\/api::sermon\.sermon\/(create|[a-z0-9]{20,})(?:[/?#]|$)/

/** Where the wizard lives now that it's a section inside Manage Contents,
 *  not its own sidebar entry — see the doc comment above. */
const MANAGE_CONTENTS_MEDIA_LIBRARY = '/admin/manage-contents/media-library'

/**
 * ── HIDING CONTENT MANAGER / MEDIA LIBRARY / CONTENT-TYPE BUILDER, 2026-09-24
 * Jude: hide these three from the sidebar, and make sure nobody reaches them
 * by typing the URL either. "Manage Contents" (registered below) is their
 * eventual replacement — no longer empty as of the same day; it holds the
 * Sections hub and, so far, the one section this hides three plugins for.
 *
 * This is a route-level lock, the same tool as `SERMON_FORM_PATH` above: a
 * pathname the editor's browser is not allowed to sit on, poll-and-redirect
 * to Manage Contents instead. It is NOT a permissions change — the wizard
 * saves through these same three plugins' admin APIs (Content Manager's
 * `/content-manager/collection-types/...` for every save, Upload's `/upload`
 * for files), so revoking those permissions at the role level would break
 * the wizard along with the pages this hides. Blocking navigation instead of
 * the API leaves that untouched: fetch calls never go through
 * `window.location`, so nothing here can catch or block them, only an actual
 * page load can.
 *
 * Worth knowing before relying on this as the only gate: it is a client-side
 * redirect, same as the sermon-form one. It stops browsing and stops a typed
 * URL from landing on the page, but it doesn't reach anyone hitting Strapi's
 * admin API directly rather than through this app. Closing that door too is
 * a role-permissions change in Settings → Roles (or a server-side bootstrap
 * script) — a bigger change, and one this file deliberately doesn't make on
 * its own since it risks breaking the wizard's own API calls if done wrong.
 */
const BLOCKED_ADMIN_PATH =
  /^\/admin\/(content-manager|plugins\/upload|plugins\/content-type-builder)(?:[/?#]|$)/

/** The wizard's old address, from when "Messages" was its own sidebar
 *  entry. Redirected rather than left to 404, so nothing that was bookmarked
 *  or left open in a tab during testing breaks. */
const LEGACY_MESSAGES_PATH = /^\/admin\/messages(?:\/(new|[a-z0-9]{20,}))?(?:[/?#]|$)/

const FONT_STACK =
  "'proxima-nova', 'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"

/** The site's own easing token (`shared/styles/tokens.ts`). */
const EASE = 'cubic-bezier(0.32,0.72,0,1)'

export default {
  config: {
    /**
     * No locale switcher. ROG has one admin; a language dropdown listing
     * twenty-four locales is a control they will never use and one more
     * thing to explain during handover training.
     */
    locales: [],

    /** The wave mark from the site's own navbar, recoloured white for the
     *  permanently-dark sidebar and login panel. */
    auth: { logo: rogLogo },
    menu: { logo: rogLogo },
    head: { favicon: rogFavicon },

    theme: {
      light: {
        colors: {
          neutral0: '#ffffff',
          neutral100: '#f4f4f4',
          neutral150: '#ededed',
          neutral200: '#e4e4e4',
          neutral300: '#c4c4c4',
          neutral400: '#a6a6a6',
          neutral500: '#8f8f8f',
          neutral600: '#5c5c5c',
          neutral700: '#3d3d3d',
          neutral800: '#262626',
          neutral900: '#161616',
          neutral1000: '#000000',

          primary100: '#e8f5f3',
          primary200: '#c7e8e3',
          primary500: BRAND.teal,
          primary600: BRAND.tealDeep,
          primary700: '#0f4640',

          buttonPrimary500: BRAND.tealHover,
          buttonPrimary600: BRAND.teal,

          secondary100: '#e8f5f3',
          secondary200: '#c7e8e3',
          secondary500: BRAND.teal,
          secondary600: BRAND.tealDeep,
          secondary700: '#0f4640',
        },
      },
      dark: {
        colors: {
          /* Strapi inverts this scale in dark mode — neutral0 is the page
             ground, neutral1000 the brightest text. These are the site's
             own plates in order. */
          neutral0: '#0d0d0d',
          neutral100: '#161616',
          neutral150: '#1c1c1c',
          neutral200: '#262626',
          neutral300: '#3d3d3d',
          neutral400: '#4d4d4d',
          neutral500: '#737373',
          neutral600: '#a6a6a6',
          neutral700: '#c4c4c4',
          neutral800: '#e4e4e4',
          neutral900: '#f4f4f4',
          neutral1000: '#ffffff',

          primary100: 'rgb(27 122 112 / 0.16)',
          primary200: 'rgb(27 122 112 / 0.28)',
          primary500: '#2FA294',
          primary600: BRAND.tealLight,
          primary700: '#B9E5DD',

          buttonPrimary500: BRAND.tealHover,
          buttonPrimary600: BRAND.teal,

          secondary100: 'rgb(27 122 112 / 0.16)',
          secondary200: 'rgb(27 122 112 / 0.28)',
          secondary500: '#2FA294',
          secondary600: BRAND.tealLight,
          secondary700: '#B9E5DD',
        },
      },
    },

    /**
     * Strapi's own wording, replaced with ROG's.
     *
     * Keys come from Strapi's admin translation source. An unknown key is a
     * harmless no-op — it simply falls through to Strapi's default — so this
     * list can be extended safely, but a key that stops working after a
     * Strapi upgrade will quietly revert to saying "Strapi". Worth a glance
     * after any major version bump.
     */
    translations: {
      en: {
        'app.components.LeftMenu.navbrand.title': 'River of God',
        'app.components.LeftMenu.navbrand.workplace': 'Content Studio',
        'app.components.HomePage.welcome': 'Welcome back',
        'app.components.HomePage.welcome.again': 'Welcome back',
        'app.components.HomePage.welcomeBlock.content':
          'This is where the River of God website gets its content. Anything you publish here appears on riverofgod.ph.',
        'app.components.HomePage.welcomeBlock.content.again':
          'Pick up where you left off — your most recent entries are below.',

        'Auth.form.welcome.title': 'River of God',
        'Auth.form.welcome.subtitle': 'Sign in to the Content Studio',
        'Auth.form.button.login.strapi': 'Sign in with SSO',
        'Auth.link.signin.account': 'Already have an account?',

        'app.components.Onboarding.title': 'Getting started',
        'app.components.Onboarding.label.get-started': 'Getting started',

        /* The guided-tour checklist is a separate surface from the tutorial
           video switched off below, and it names Strapi twice. */
        'app.components.GuidedTour.title': 'Three steps to get going',
        'app.components.GuidedTour.home.CONTENT_TYPE_BUILDER.title':
          'Set up your content',
        'app.components.GuidedTour.home.CONTENT_MANAGER.title': 'Add your content',
        'app.components.GuidedTour.home.APITOKEN.title': 'Connect the website',
        'app.components.GuidedTour.skip': 'Skip',

        'global.documentation': 'Help',
        'global.profile': 'My account',
      },
    },

    /**
     * ── THE "REMOVE WHAT THE CLIENT DOESN'T NEED" SWITCHES ───────────────
     * Both are officially supported and both hide Strapi-branded surfaces
     * with no client-facing purpose in a white-labelled product.
     *
     * `tutorials` is the built-in "get started" video widget. `releases` is
     * the "a new version of Strapi is available" banner — ROG does not
     * upgrade their own CMS, Alphaexplora does, so that notice is noise
     * pointing at an action they cannot take.
     *
     * Three more live in `config/admin.ts`, because they are server-side
     * flags rather than admin-app config: `nps` (Strapi's satisfaction
     * survey popup), `promoteEE` (Enterprise Edition upsells) and
     * `docLinks` (links out to Strapi's documentation).
     */
    tutorials: false,
    notifications: { releases: false },
  },

  register(app: StrapiApp) {
    /**
     * "Manage Contents" (Jude, 2026-09-24) — the one entry left for editing
     * site content. Started empty ("wag mo muna lagyan ng laman or
     * anything"); the same day Jude asked for it to become a Sections hub
     * (a card grid, modelled on Vercel's Projects dashboard) and for the
     * message wizard to move inside it as the first section, "Media
     * Library", rather than keep its own sidebar entry. See
     * ./manage-contents/ManageContentsPage.tsx for the routing and
     * ./manage-contents/SectionsHub.tsx for the card grid itself.
     *
     * Content Manager, Media Library (Strapi's own) and Content-Type
     * Builder are hidden and URL-blocked — see BLOCKED_ADMIN_PATH above —
     * because this is meant to become their one replacement, one section at
     * a time.
     */
    /**
     * The homepage (Jude, 2026-09-30: "yung mga widget na nandon random
     * lang… gusto ko related doon sa content nila at content natin"). Swaps
     * Strapi's default widgets for ROG's five — see ./dashboard/index.ts.
     *
     * A reducer that ignores `prev` replaces the whole list, including every
     * plugin's widgets (Last edited / Last published entries, Entries chart,
     * Profile, Project statistics), because plugins register before this runs.
     * The one exception is Strapi's "Last activity" (audit logs) widget, an
     * Enterprise feature that registers AFTER this hook; Community installs
     * don't have it, and if ROG ever moves to Enterprise it is one more
     * filter in a bootstrap step.
     */
    app.widgets.register(() => ROG_WIDGETS)

    app.addMenuLink({
      to: 'manage-contents',
      icon: Folder,
      intlLabel: { id: 'rog.manageContents.menu', defaultMessage: 'Manage Contents' },
      permissions: [],
      position: 1,
      Component: () => import('./manage-contents/ManageContentsPage'),
    })
  },

  bootstrap(app: StrapiApp) {
    // `app` is intentionally unused — Strapi's own scaffold logs it. Keeping
    // the parameter documents the hook's real signature for whoever edits
    // this next.
    void app

    if (typeof document === 'undefined') return

    /* ── The brand face ───────────────────────────────────────────────── */
    const font = document.createElement('link')
    font.rel = 'stylesheet'
    font.href =
      'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,400..900&display=swap'
    document.head.appendChild(font)

    /* ── A brand strip this file owns outright ────────────────────────────
       Not a Strapi element, so no rebuild can take it away or restyle it. */
    const accentBar = document.createElement('div')
    accentBar.setAttribute('aria-hidden', 'true')
    accentBar.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'height:3px',
      'z-index:2147483647',
      'pointer-events:none',
      `background:linear-gradient(90deg, ${BRAND.tealDeep} 0%, ${BRAND.teal} 35%, ${BRAND.tealLight} 70%, ${BRAND.teal} 100%)`,
    ].join(';')
    document.body.appendChild(accentBar)

    /* ── Auth-route flag ──────────────────────────────────────────────────
       Strapi exposes no route-change event and this is a single-page app,
       so the URL can change without a load. Polling the pathname is what
       the POC settled on; 400ms is imperceptible and costs nothing. The
       class is what lets the CSS below reflow ONLY the login screen and
       leave the authenticated app alone. */
    const AUTH_CLASS = 'rog-auth'
    const syncAuthClass = () => {
      const onAuth = window.location.pathname.includes('/auth/')
      document.body.classList.toggle(AUTH_CLASS, onAuth)
    }
    syncAuthClass()
    window.setInterval(syncAuthClass, 400)

    /* ── Sermon form → wizard ─────────────────────────────────────────────
       Rides the same 400ms poll. The admin's router listens for popstate,
       so replacing the URL and announcing it moves the app to the wizard
       without a page reload (and without leaving the sermon form in the
       Back history). */
    if (REDIRECT_SERMON_FORM_TO_WIZARD) {
      const redirectSermonForm = () => {
        const m = window.location.pathname.match(SERMON_FORM_PATH)
        if (!m) return
        const target =
          m[1] === 'create'
            ? `${MANAGE_CONTENTS_MEDIA_LIBRARY}/new`
            : `${MANAGE_CONTENTS_MEDIA_LIBRARY}/${m[1]}`
        window.history.replaceState(null, '', target)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
      redirectSermonForm()
      window.setInterval(redirectSermonForm, 400)
    }

    /* ── The wizard's old address → its new one inside Manage Contents ────
       "Messages" was its own sidebar entry until 2026-09-24; this catches
       anything still pointed at /admin/messages... (a bookmark, a tab left
       open from testing) rather than letting it 404. Same poll, same
       replaceState + popstate pattern as the sermon-form redirect above. */
    const redirectLegacyMessagesPath = () => {
      const m = window.location.pathname.match(LEGACY_MESSAGES_PATH)
      if (!m) return
      const target = m[1] ? `${MANAGE_CONTENTS_MEDIA_LIBRARY}/${m[1]}` : MANAGE_CONTENTS_MEDIA_LIBRARY
      window.history.replaceState(null, '', target)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    redirectLegacyMessagesPath()
    window.setInterval(redirectLegacyMessagesPath, 400)

    /* ── Content Manager / Media Library / Content-Type Builder → blocked ─
       Same 400ms poll, always on (not behind a flag — this one is an access
       lock, not a UX preference). See BLOCKED_ADMIN_PATH's comment above for
       what this does and doesn't cover. Lands on Manage Contents rather than
       the bare dashboard, since that's the real replacement now. */
    const redirectBlockedRoute = () => {
      if (!BLOCKED_ADMIN_PATH.test(window.location.pathname)) return
      window.history.replaceState(null, '', '/admin/manage-contents')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    redirectBlockedRoute()
    window.setInterval(redirectBlockedRoute, 400)

    /* ── Homepage layout reset ────────────────────────────────────────────
       Strapi saves each admin's homepage layout (order, widths, deleted
       widgets) per user, and a saved layout is an ALLOW-LIST: any widget not
       in it is hidden. So an admin who ever dragged or deleted a default
       widget would open the homepage and find ROG's widgets missing.

       On the homepage only, once per page load: if a layout is saved and
       either contains none of ROG's widgets or still names Strapi's old
       ones, replace it with ROG's five. A saved layout made only of ROG
       widgets — someone reordering, resizing or removing one of them — is
       left alone. Silent on any failure (the default layout then applies),
       and reloads at most once per browser session so a rejected save can
       never loop. */
    let layoutChecked = false
    const resetHomepageLayout = async () => {
      if (layoutChecked || !/^\/admin\/?$/.test(window.location.pathname)) return
      layoutChecked = true
      try {
        const client = getFetchClient()
        const res = await client.get<{ data: { widgets?: { uid: string }[] } | null }>('/admin/homepage/layout')
        const saved = res.data?.data?.widgets
        if (!Array.isArray(saved)) return
        const ours = new Set(ROG_WIDGET_UIDS)
        const needsReset = saved.some((w) => !ours.has(w.uid)) || !saved.some((w) => ours.has(w.uid))
        if (!needsReset) return
        await client.put('/admin/homepage/layout', {
          widgets: ROG_WIDGET_UIDS.map((uid, i) => ({ uid, width: i === ROG_WIDGET_UIDS.length - 1 ? 12 : 6 })),
        })
        if (window.sessionStorage.getItem('rog-layout-reset')) return
        window.sessionStorage.setItem('rog-layout-reset', '1')
        window.location.reload()
      } catch {
        /* leave Strapi's own layout handling to cope */
      }
    }
    void resetHomepageLayout()
    window.setInterval(() => void resetHomepageLayout(), 400)

    /* ── Sidebar labels, only if Strapi is still hiding them ──────────────
       Strapi renders a real text label beside every nav icon and hides it
       with the standard visually-hidden pattern. Un-hiding what is already
       there turns the icon rail into a labelled sidebar using the same
       links, routes and permissions — nothing new is injected.

       This is FEATURE-DETECTED rather than forced, because a Strapi version
       that already shows its labels would end up rendering them twice. The
       check looks for a nav link whose span is clipped to roughly 1px and
       only then opts in. */
    const markSidebar = () => {
      const nav = document.querySelector('#strapi nav')
      if (!nav) return false
      /* Tag the main sidebar so CSS can distinguish it from secondary
         navs inside Content Manager, Settings, etc. */
      nav.classList.add('rog-main-nav')
      const span = nav.querySelector('a span')
      if (!span) return false
      const rect = span.getBoundingClientRect()
      const hidden = rect.width <= 2 || rect.height <= 2
      document.body.classList.toggle('rog-nav-labels', hidden)
      return true
    }
    let navTries = 0
    const navTimer = window.setInterval(() => {
      navTries += 1
      if (markSidebar() || navTries > 40) window.clearInterval(navTimer)
    }, 250)

    /* ── Injected stylesheet ──────────────────────────────────────────────
       A <style> element rather than a CSS import: the admin bundler's
       handling of arbitrary CSS imports has been inconsistent across Strapi
       5 releases, and this needs no build support at all. */
    const style = document.createElement('style')
    style.id = 'rog-admin-theme'
    style.textContent = `
/* ============================================================
   ROG Content Studio — admin skin
   Stable selectors only: #strapi, real tags, pseudo-elements,
   pseudo-classes, attribute selectors, and classes this file sets.
   Never a styled-components hash.
   ============================================================ */

:root {
  --rog-teal: ${BRAND.teal};
  --rog-teal-light: ${BRAND.tealLight};
  --rog-teal-deep: ${BRAND.tealDeep};
  --rog-ease: ${EASE};
}

/* Typography — one face everywhere, matching the site. */
#strapi,
#strapi button,
#strapi input,
#strapi textarea,
#strapi select,
#strapi h1, #strapi h2, #strapi h3, #strapi h4, #strapi h5, #strapi h6 {
  font-family: ${FONT_STACK};
}

#strapi h1, #strapi h2, #strapi h3 {
  letter-spacing: -0.02em;
}

/* ------------------------------------------------------------
   Ambient ground — the site's "river glow", theme-aware.
   Light is the DEFAULT so a light-system user never gets dark
   panels on a near-black page. Dark is opt-in via the media
   query, which is the bug the POC shipped and had to fix.
   ------------------------------------------------------------ */
body {
  background-color: #f4f4f4;
  background-image:
    radial-gradient(ellipse 50% 40% at 18% 12%, rgb(27 122 112 / 0.10), transparent 62%),
    radial-gradient(ellipse 45% 40% at 88% 88%, rgb(143 212 201 / 0.14), transparent 62%);
  background-attachment: fixed;
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #0d0d0d;
    background-image:
      radial-gradient(ellipse 50% 40% at 18% 12%, rgb(27 122 112 / 0.16), transparent 62%),
      radial-gradient(ellipse 45% 40% at 88% 88%, rgb(45 212 191 / 0.10), transparent 62%);
  }
}

/* ------------------------------------------------------------
   Controls — the site's rounded, teal-ringed treatment.
   ------------------------------------------------------------ */
#strapi button,
#strapi [role="button"] {
  border-radius: 10px;
  transition: transform 160ms var(--rog-ease), box-shadow 160ms var(--rog-ease),
              background-color 160ms var(--rog-ease);
}

#strapi button:not(:disabled):not([aria-disabled="true"]):hover {
  transform: translateY(-1px);
}

#strapi button:not(:disabled):not([aria-disabled="true"]):active {
  transform: translateY(0) scale(0.985);
}

#strapi input,
#strapi textarea,
#strapi select {
  border-radius: 10px;
}

/* One visible focus treatment for everything, on the brand hue.
   Never removed — a focus ring is the only thing a keyboard user has. */
#strapi :focus-visible {
  outline: 2px solid var(--rog-teal-light);
  outline-offset: 2px;
  border-radius: 8px;
}

/* Every clickable thing says so. */
#strapi button,
#strapi a,
#strapi [role="button"],
#strapi label[for],
#strapi summary {
  cursor: pointer;
}

#strapi button:disabled,
#strapi [aria-disabled="true"] {
  cursor: not-allowed;
}

/* Selection and scrollbars in brand, rather than OS blue. */
#strapi ::selection {
  background: rgb(27 122 112 / 0.32);
  color: inherit;
}

#strapi ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

#strapi ::-webkit-scrollbar-track {
  background: transparent;
}

#strapi ::-webkit-scrollbar-thumb {
  background: rgb(27 122 112 / 0.45);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

#strapi ::-webkit-scrollbar-thumb:hover {
  background: rgb(27 122 112 / 0.70);
  background-clip: content-box;
}

/* ------------------------------------------------------------
   The MAIN sidebar — permanently dark in both themes, by choice.
   Scoped to .rog-main-nav (a class added by bootstrap) so that
   secondary navs inside Content Manager, Settings, etc. are
   completely untouched and keep their default Strapi layout.

   COLLAPSIBLE: 60px when idle → 240px on hover.
   ------------------------------------------------------------ */
.rog-main-nav {
  background: linear-gradient(180deg, #161616 0%, #0d0d0d 100%) !important;
  border-right: 1px solid #262626 !important;
  transition: width 280ms var(--rog-ease), min-width 280ms var(--rog-ease) !important;
  overflow: hidden !important;
  align-items: stretch !important;
}

/* Inner wrappers — force stretch so links fill full width. */
.rog-main-nav > *,
.rog-main-nav > * > * {
  align-items: stretch !important;
}

/* Every link: row layout, pinned to the far left, white text. */
.rog-main-nav a {
  border-radius: 10px;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  text-align: left !important;
  padding: 10px 12px !important;
  margin: 2px 4px 2px 4px !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  color: #ffffff !important;
}

.rog-main-nav a svg {
  color: #ffffff !important;
  fill: currentColor !important;
}

/* Force nested wrappers to left-aligned rows. */
.rog-main-nav a > *,
.rog-main-nav a > * > *,
.rog-main-nav a > * > * > * {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  text-align: left !important;
}

/* Icons: always visible, never shrink, fixed 24px box. */
.rog-main-nav a svg {
  flex-shrink: 0 !important;
  min-width: 24px !important;
  width: 24px !important;
  height: 24px !important;
}

.rog-main-nav img {
  max-height: 28px;
  width: auto;
}

/* Content Manager, Media Library, Content-Type Builder, Deploy, Marketplace —
   hidden per Jude's request (2026-09-24, then again the same day for Deploy
   and Marketplace: "di naman kailangan yon"). Matched by href, the real
   route each nav link points to, not a hashed class, so this survives an
   admin rebuild the same way every other rule in this file does. The actual
   URL lock (for Content Manager/Media Library/Content-Type Builder only —
   Deploy and Marketplace have no in-app route to intercept) is the JS
   poller in bootstrap(); this only hides the sidebar entry.

   Hides the <li>, not just the <a>, and on purpose: the nav's <ul> lays
   items out with a 12px gap between flex children, and that gap still
   counts a display:none <a> nested one level down as an empty-but-present
   <li> — so hiding only the anchor left 5 dead 0-height <li>s sitting
   between "Manage Contents" and "Settings", each still contributing its
   12px gap, which added up to a 60px hole in the sidebar ("pakiayos yung
   spacing", Jude, 2026-09-24 — screenshot showed the gap). Hiding the <li>
   itself removes it from the flex layout entirely, so the gap no longer
   counts it and the remaining icons sit at the normal 12px rhythm.

   :has() is used to reach the <li> from the same href selectors rather than
   hand-matching each entry's DOM depth — deliberately NOT pinned to a
   specific child/grandchild chain (an earlier version of this rule tried
   that, guessing the depth from a disposable, freshly-seeded test instance,
   and it undercounted: Content Manager on Jude's real data carries an
   unread-count badge that wraps its <a> one level deeper than the bare
   test instance did, so the depth-pinned version matched everywhere except
   the one entry it needed most — Content Manager stayed visible, still
   unclickable because the JS poller is a separate mechanism from this CSS).
   Plain :has(a[...]), with no combinator, matches the <a> at ANY depth
   inside the <li>, so badges, tooltips, or whatever else Strapi wraps a
   given entry in from one install to the next can't break this again —
   it still keys off the stable href, never markup shape. */
.rog-main-nav li:has(a[href^="/admin/content-manager"]),
.rog-main-nav li:has(a[href^="/admin/plugins/upload"]),
.rog-main-nav li:has(a[href^="/admin/plugins/content-type-builder"]),
.rog-main-nav li:has(a[href^="/admin/plugins/cloud"]),
.rog-main-nav li:has(a[href*="market.strapi.io"]) {
  display: none !important;
}

/* Hover and current-page state — explicit now rather than left to Strapi's
   own hover styling, which the structural !important overrides above
   appear to have covered up (Jude, 2026-09-24: "nawala yung hover effect
   nung navbar"). aria-current="page" is the attribute React Router's
   NavLink sets on the active link — stable, not a hashed class. */
.rog-main-nav a {
  transition: background-color 160ms var(--rog-ease), color 160ms var(--rog-ease);
}

/* Strapi 5.53 paints nav links white by default, which turned every
   inactive link (white text) into a blank white box on the dark
   sidebar and the phone top bar. Transparent at rest; the hover and
   current-page rules below are more specific, so they still win. */
.rog-main-nav a {
  background-color: transparent !important;
}

.rog-main-nav a:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

.rog-main-nav a[aria-current="page"] {
  background-color: rgb(27 122 112 / 0.28) !important;
  color: var(--rog-teal-light) !important;
}

.rog-main-nav a[aria-current="page"] svg {
  color: var(--rog-teal-light) !important;
}

/* Text labels: collapsed = zero width, hidden. */
body.rog-nav-labels .rog-main-nav a span {
  position: static !important;
  height: auto !important;
  clip: auto !important;
  clip-path: none !important;
  white-space: nowrap !important;
  font-size: 0.875rem;
  margin-left: 12px !important;
  max-width: 0 !important;
  width: 0 !important;
  overflow: hidden !important;
  opacity: 0;
  transition: max-width 280ms var(--rog-ease),
              width 280ms var(--rog-ease),
              opacity 200ms var(--rog-ease);
}

/* On hover → expand text labels */
body.rog-nav-labels .rog-main-nav:hover a span {
  max-width: 200px !important;
  width: auto !important;
  overflow: visible !important;
  opacity: 1;
  transition-delay: 60ms;
}

/* 1080px is Strapi's own "large" breakpoint — below it the sidebar
   becomes a top bar with a Menu drawer. Pinning these widths any lower
   (the old 960px) squashed that top bar into a 240px strip on
   960–1079px screens. */
@media (min-width: 1080px) {
  body.rog-nav-labels .rog-main-nav {
    width: 60px !important;
    min-width: 60px !important;
  }

  body.rog-nav-labels .rog-main-nav:hover {
    width: 240px !important;
    min-width: 240px !important;
  }
}

/* ------------------------------------------------------------
   Manage Contents — the Sections card grid (SectionsHub.tsx).
   A component this file owns outright, not a Strapi surface, so
   plain classes are fine here without the hashed-class caveat.
   ------------------------------------------------------------ */
.rog-section-card {
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  transition: transform 200ms var(--rog-ease), box-shadow 200ms var(--rog-ease);
}

.rog-section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -12px rgb(27 122 112 / 0.35);
}

/* ------------------------------------------------------------
   Phones and tablets (below Strapi's 1080px "large" breakpoint).

   Strapi turns the sidebar into a top bar with a Menu button and a
   drop-down drawer (#burger-menu). The drawer is portalled outside
   #strapi, so it gets the font, the dark sidebar look and the
   hidden-entries rule again here. Everything is keyed to real
   routes, ARIA attributes and classes this file or our own
   components set — never a styled-components hash.
   ------------------------------------------------------------ */
@media (max-width: 1079px) {
  .rog-main-nav {
    border-right: 0 !important;
    border-bottom: 1px solid #262626 !important;
  }

  .rog-main-nav a {
    margin: 0 !important;
  }

  /* Strapi paints the Menu button white — a blank white box on our
     dark bar. */

  .rog-main-nav button {
    background: rgba(255, 255, 255, 0.06) !important;
    border: 1px solid #333333 !important;
    color: #ffffff !important;
  }

  .rog-main-nav button svg,
  .rog-main-nav button svg path {
    fill: #ffffff !important;
    color: #ffffff !important;
  }
}

#burger-menu {
  font-family: ${FONT_STACK};
  background: linear-gradient(180deg, #161616 0%, #0d0d0d 100%) !important;
  border-bottom: 1px solid #262626 !important;
}

#burger-menu > div,
#burger-menu [data-radix-scroll-area-viewport] {
  background: transparent !important;
}

#burger-menu a {
  background-color: transparent !important;
  color: #ffffff !important;
  border-radius: 10px;
  transition: background-color 160ms var(--rog-ease);
}

#burger-menu a svg {
  fill: currentColor !important;
  color: inherit !important;
}

#burger-menu a span {
  color: inherit !important;
}

#burger-menu a:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

#burger-menu a[aria-current="page"] {
  background-color: rgb(27 122 112 / 0.28) !important;
  color: var(--rog-teal-light) !important;
}

#burger-menu [role="separator"] {
  background: #262626 !important;
}

#burger-menu button,
#burger-menu button span {
  color: #ffffff !important;
}

#burger-menu li:has(a[href^="/admin/content-manager"]),
#burger-menu li:has(a[href^="/admin/plugins/upload"]),
#burger-menu li:has(a[href^="/admin/plugins/content-type-builder"]),
#burger-menu li:has(a[href^="/admin/plugins/cloud"]),
#burger-menu li:has(a[href*="market.strapi.io"]) {
  display: none !important;
}

/* ------------------------------------------------------------
   Manage Contents lists and wizards on small screens.
   The classes are set by our own components (EventList,
   MessageList, MinistryList and the Review/Summary steps).
   ------------------------------------------------------------ */
.rog-show-sm {
  display: none !important;
}

@media (max-width: 767px) {
  .rog-show-sm {
    display: block !important;
    margin-top: 2px;
  }

  /* Keep the name, status and edit button; the hidden columns'
     key facts move under the name (the .rog-show-sm line). */
  .rog-list-events :is(th, td):is(:nth-child(2), :nth-child(3), :nth-child(4)),
  .rog-list-messages :is(th, td):is(:nth-child(2), :nth-child(3), :nth-child(4)),
  .rog-list-ministries :is(th, td):is(:nth-child(2), :nth-child(3)) {
    display: none !important;
  }

  .rog-list th,
  .rog-list td {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .rog-list .rog-cell-title {
    max-width: calc(100vw - 280px) !important;
  }
}

@media (max-width: 519px) {
  /* Review rows: the label goes on its own line so the value keeps
     the full width instead of a 90px sliver beside a 140px label. */
  .rog-review-row {
    flex-wrap: wrap !important;
    row-gap: 4px !important;
  }

  .rog-review-label {
    flex: 1 1 100% !important;
  }
}

/* Secondary navs (Content Manager, Settings, etc.) — leave
   them completely alone. Undo any styles that might leak. */
#strapi nav:not(.rog-main-nav) {
  width: auto !important;
  min-width: auto !important;
  overflow: visible !important;
  transition: none !important;
  align-items: initial !important;
}

/* ------------------------------------------------------------
   Login screen — a split brand panel instead of a lone centred card.
   Scoped to body.rog-auth, so the authenticated app is untouched.
   Below 960px it falls back to Strapi's own centred layout rather
   than cramping the split.
   ------------------------------------------------------------ */
@media (min-width: 960px) {
  body.rog-auth #strapi > div {
    min-height: 100vh;
  }

  body.rog-auth::before {
    content: '';
    position: fixed;
    inset: 0 auto 0 0;
    width: 42vw;
    z-index: 0;
    background:
      radial-gradient(ellipse 70% 50% at 25% 20%, rgb(27 122 112 / 0.35), transparent 65%),
      linear-gradient(160deg, #161616 0%, #0d0d0d 100%);
    border-right: 1px solid #262626;
  }

  body.rog-auth::after {
    content: 'Content Studio';
    position: fixed;
    left: 4rem;
    bottom: 4rem;
    z-index: 1;
    color: ${BRAND.tealLight};
    font-family: ${FONT_STACK};
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: rgb(27 122 112 / 0.18);
    box-shadow: inset 0 0 0 1px rgb(143 212 201 / 0.25);
  }

  body.rog-auth #strapi {
    position: relative;
    z-index: 2;
  }

  /* The right half owns the form. Without an explicit height and a
     centring flex context the card sits hard against the top of a
     900px-tall screen with the whole lower half empty — which is what
     the first live pass looked like. */
  body.rog-auth #strapi > div > div {
    margin-left: 42vw;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

/* ------------------------------------------------------------
   Strapi's own promotional surfaces.

   ⚠ THE :not(nav a) IS LOAD-BEARING. The POC's first version of this
   rule hid the sidebar's Marketplace link too, because that is a real
   feature living at market.strapi.io. Hiding a working feature while
   trying to hide an advert is exactly the regression this work has to
   avoid. Leave both exclusions in place.
   ------------------------------------------------------------ */
#strapi a[href*="strapi.io"]:not(nav a):not([href*="market.strapi.io"]),
#strapi a[href*="strapi.cloud"]:not(nav a) {
  display: none !important;
}

/* ------------------------------------------------------------
   Motion respects the OS setting, same as the site.
   ------------------------------------------------------------ */
@media (prefers-reduced-motion: reduce) {
  #strapi button,
  #strapi [role="button"] {
    transition: none !important;
  }
  #strapi button:hover,
  #strapi button:active,
  #strapi [role="button"]:hover {
    transform: none !important;
  }
}
`
    document.head.appendChild(style)
  },
}

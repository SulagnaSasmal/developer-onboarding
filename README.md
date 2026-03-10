# Developer Onboarding — Payments API

An interactive, five-step developer onboarding experience for the Payments API. Checklist-gated navigation ensures developers complete each prerequisite before advancing, taking them from zero to their first live payment.

## Live Demo

Hosted on GitHub Pages: `sulagnasasmal.github.io/developer-onboarding/`

## Onboarding Flow

| Step | Page | What developers do |
|------|------|--------------------|
| Landing | `index.html` | Overview of the 5-step journey |
| Step 1 | `step-1.html` | Create an account and generate API keys |
| Step 2 | `step-2.html` | Install the SDK (Node.js / Python / cURL) |
| Step 3 | `step-3.html` | Make a test API call in the sandbox environment |
| Step 4 | `step-4.html` | Set up and verify webhooks |
| Step 5 | `step-5.html` | Complete the go-live checklist |
| Success | `success.html` | Confirmation and next steps |

## Tech Stack

- HTML (80.7%), CSS (14.8%), JavaScript (4.5%)
- No frameworks, no build pipeline
- `localStorage` for checklist progress persistence
- Outfit / Inter / JetBrains Mono (Google Fonts)

## Dark / Light Mode

All pages support dark and light themes via a toggle button (◐ / ☀) in the navigation bar. Theme preference persists in `localStorage`. System `prefers-color-scheme` is respected on first visit.

## Status

**Phase 3 — Developer Onboarding — Complete**

| Area | Status |
|------|--------|
| Landing page | Complete |
| Steps 1–5 content | Complete |
| Checklist-gated navigation | Complete |
| Success / completion page | Complete |
| Dark / light theme support | Complete |
| README | Complete |

## Features

- Checklist-gated navigation — cannot advance to the next step without checking off prerequisites
- Multi-language code samples: Node.js, Python, cURL
- Sandbox and live environment coverage
- ACH, Wire (Fedwire), and RTP payment type examples
- Webhook signature verification walkthrough

## Future Enhancements

- Dynamic "Try It" sandbox widget (live API calls from the browser)
- Progress saving across sessions (already uses `localStorage`)
- Mobile-optimised checklist interactions
- Team onboarding mode (track completion per developer)

## Usage

Open `index.html` in any browser, or deploy to GitHub Pages.

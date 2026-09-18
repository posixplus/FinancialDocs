# US Family Estate Planning Guide - Will and Trust

A bilingual (English / தமிழ்) guide to Wills, Revocable Living Trusts and Transfer on Death Deeds in Virginia,
compiled by N. Jayakanthan, Richmond, Virginia.

**Live site:** https://will-trust-guide.vercel.app

> **Disclaimer:** I am not a Legal Advisor nor a lawyer. This is compiled with Virginia State legal requirements.
> This document is for general awareness information only. Not legal advice. Consult an Estate Planning Attorney
> for your specific situation.

## How it works

The Google Docs are the master copy. Nothing on the site is typed by hand.

| Language | Google Doc |
|---|---|
| English | https://docs.google.com/document/d/1cK5UMJgyhb5OaEuwyl2TXd2OGlXu82mdgJ64o9QaD_g |
| தமிழ் | https://docs.google.com/document/d/1qasNbHHRaMCfMToDbb1xEOQL-rcq4aLlDQIBRoaL2Gk |

```
Google Docs ──(GitHub Action: daily or on demand)──> content/*.json + *.md + public/pdf/*.pdf ──(commit)──> Vercel deploy
```

1. **Edit the Google Doc** as usual. Both Docs must stay shared as *Anyone with the link → Viewer*.
2. **Publish:** GitHub → *Actions* → *Sync from Google Docs* → *Run workflow*. It also runs every morning by itself.
3. The action commits the refreshed content and PDFs only if something changed; Vercel redeploys automatically.

`content/en.md` and `content/ta.md` are readable snapshots, so the commit history shows exactly what changed in each sync.

### Keeping the structure the site relies on

- Numbered section headings (`1. What is a Will?`) must stay as *Heading* style in the Doc. Both languages should
  keep the same section order so the language switch lands on the same section.
- Bold, italic, bullet/numbered lists, tables and links carry over. Colours and fonts from the Doc are ignored on purpose.
- The sync refuses to publish if a Doc can't be downloaded or has fewer than 10 sections, so the live site is never replaced by a broken version.

## Local development

```bash
npm ci
npm run sync      # pull both Docs (needs internet)
npm run build     # -> dist/
npx playwright install chromium && npm run pdf   # -> public/pdf/
npx serve dist
```

Labels (header text, PDF footer, etc.) live in `site.config.json`. Design: `src/styles.css` (site) and `src/print.css` (PDF).
Fonts (Hind Madurai, Libre Caslon Text, both SIL Open Font License) are self-hosted in `src/fonts`.

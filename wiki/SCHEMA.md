# RadLeads Wiki Schema

Rules for LLM maintenance of this wiki. Read before editing any page.

## Directory layout

```
wiki/
  SCHEMA.md              ← this file (conventions)
  index.md               ← catalog of all pages (update on every add/change)
  log.md                 ← append-only chronological record
  architecture.md        ← system overview, tech stack, deployment
  domain-model.md        ← data model: Company → LeadPerson → LeadEmail
  backend.md             ← .NET API: controllers, services, jobs, DB
  frontend.md            ← React app: pages, context, routing
  enrichment-pipeline.md ← Research + Enrich flow, AI calls, scraping
  email-system.md        ← Campaigns, warmup, dispatch jobs, tracking
  dialer.md              ← Dialer panel, call logs, follow-up emails
```

## Page format

```markdown
# Page Title

> One-line description of this page's scope.

## [Sections...]

## Related
- [[page-name]] — why linked
```

## Conventions

- **Filenames**: lowercase kebab, `.md`
- **Links**: `[[filename-without-ext]]` style for cross-references
- **Dates**: ISO 8601 (2026-04-12)
- **Code**: use fenced blocks with language tag
- **Enums/status values**: always use the exact string from code

## Workflows

### Adding a new feature
1. Update the relevant domain page(s)
2. If new concept warrants its own page, create it + add to index
3. Append to log: `## [DATE] feature | <title>`

### Answering a deep question
1. Read index.md first to find relevant pages
2. Read those pages
3. If answer is valuable synthesis → file it as a new page or section
4. Append to log: `## [DATE] query | <title>`

### Periodic lint
Ask LLM to: find contradictions, orphan pages, stale claims, missing links.

## What NOT to put here
- Git history (use `git log`)
- Ephemeral task state (use tasks/plans)
- Code that already self-documents

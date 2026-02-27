---
description: How to update developer documentation after significant code changes
---

# Documentation Update Workflow

After completing a significant feature, bug fix, or architectural change, follow these steps to keep `DEVELOPER_GUIDE.md` up to date.

## When to Update

- New API routes added or changed
- Database schema changes (new tables, columns, migrations)
- New environment variables introduced
- New dependencies added to `package.json`
- Authentication flow changes
- New pages or component architecture changes
- Deployment configuration changes
- Known limitations resolved or new ones discovered

## Steps

1. Open `DEVELOPER_GUIDE.md` in the project root
2. Update the **version date** and **commit hash** at the top
3. Update the relevant sections:
   - **Section 3** (Directory Structure) — if new files/folders added
   - **Section 4** (Environment Variables) — if new env vars
   - **Section 5** (Database Schema) — if schema changed
   - **Section 7** (API Routes) — if new/changed endpoints
   - **Section 8** (Pages & Components) — if new UI pages
   - **Section 13** (Known Limitations) — remove fixed items, add new ones
   - **Appendix** (Git History) — add latest commits
4. Commit with message format: `docs: update DEVELOPER_GUIDE — [brief description]`

## Documentation Quality Checklist

- [ ] All API routes have method, path, and description
- [ ] All DB tables have full CREATE TABLE statements
- [ ] Environment variables include where to obtain them
- [ ] New features are reflected in the architecture diagram
- [ ] Known limitations list is current

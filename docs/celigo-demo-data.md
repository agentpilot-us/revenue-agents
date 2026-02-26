# Celigo Demo: Data Setup and "Create Content → Contacts → Send Email" Flow

## Why the play run page had no contacts

When you click **"Run Feature Release play"** from the dashboard, the run page generates email, LinkedIn, and talking points but the **Contacts** sidebar was empty because:

1. The Feature Release signal link did not include a **segment** (department). The run page needs a `segmentId` to load contacts for that buying group.
2. The run-content API now **defaults to the company’s first department** when no segment is passed, and the run page **falls back to the first department that has contacts** when no segment is returned. So after the fix, contacts should appear.

## Flow: Create content → List of contacts → Send email

1. **Create content** – From dashboard, click "Run Feature Release play" (or any play). You land on the run page; content is generated (email, LinkedIn, talking points).
2. **List of contacts** – The right-hand **Contacts** panel shows contacts for the segment (or the first segment with contacts). Each contact has **Send** (email) and **Copy + Open** (LinkedIn).
3. **Send email** – Click **Send** next to a contact to send the generated email to that contact (via the send-email API). Use **Copy** on the email/LinkedIn blocks to copy the text, or **Edit** to open create-content with the same context.

## Uploading data for the Celigo demo

### Option 1: Full Celigo seed (recommended)

Seeds Lattice HQ, 4 buying groups (RevOps, IT, PeopleOps, Finance), **12 contacts** (3 per group), 2 sales pages, content library, and demo signals.

```bash
npx dotenv -e .env.local -- tsx prisma/seed-demo-celigo.ts
```

Or, if configured in `package.json`:

```bash
npm run seed:demo:celigo
```

**Requirements:**

- `DATABASE_URL` in `.env.local`
- A user with email `demo-saas@agentpilot.us` (or set `DEMO_USER_EMAIL`) — sign in once so the user exists

After the seed:

- **Target companies** → Lattice HQ has 4 departments and 12 contacts.
- **Dashboard** → "New feature release ready to share" and other hot signals appear.
- **Run Feature Release play** → Run page shows generated content and the **Contacts** panel with the segment’s contacts (e.g. RevOps or first department with contacts).

### Option 2: Add or update contacts only

If Lattice and departments already exist but you need more contacts or different data:

1. **Use the app**  
   Target companies → Lattice HQ → **Contacts** → "Add manually" or "Paste from LinkedIn" / "Import CSV".

2. **Run a small script**  
   Create a script that uses `prisma.contact.create` (or upsert) with:

   - `companyId`: Lattice company id
   - `companyDepartmentId`: department id (from `CompanyDepartment` for that company)
   - `firstName`, `lastName`, `title`, `email`, `linkedinUrl` (optional)

   Example pattern:

   ```ts
   const company = await prisma.company.findFirst({
     where: { name: 'Lattice HQ', userId },
     select: { id: true },
   });
   const dept = await prisma.companyDepartment.findFirst({
     where: { companyId: company.id, customName: 'RevOps' },
     select: { id: true },
   });
   await prisma.contact.create({
     data: {
       companyId: company.id,
       companyDepartmentId: dept.id,
       firstName: 'Jane',
       lastName: 'Doe',
       title: 'VP of RevOps',
       email: 'jane.doe@lattice.com',
       linkedinUrl: 'https://linkedin.com/in/janedoe',
     },
   });
   ```

3. **CSV import**  
   If the app supports CSV import for contacts, use that and assign contacts to the correct department.

### Option 3: Clean up then re-seed

If the demo has extra departments or stale data:

1. **Clean up extra departments** (keeps RevOps, IT, PeopleOps, Finance):

   ```bash
   npx dotenv -e .env.local -- tsx prisma/cleanup-celigo-demo-departments.ts
   ```

   Use `DRY_RUN=1` to preview only.

2. **Ensure all four groups exist and fix workflow/signals**:

   ```bash
   npx dotenv -e .env.local -- tsx prisma/finalize-celigo-demo.ts
   ```

3. **Re-run the full seed** to recreate contacts and campaigns (seed is idempotent for company/departments; it may skip or update existing records).

## Verifying the run page shows contacts

1. Sign in as the demo user.
2. Dashboard → click **"Run Feature Release play →"** (green "New feature release ready to share" card).
3. Wait for content generation to finish.
4. Check the **Contacts** panel on the right: it should list contacts for one of the segments (e.g. RevOps or the first department with contacts).
5. If it still says "No contacts found for this segment", ensure the Celigo seed has been run so Lattice has departments and contacts, and that those contacts have `companyDepartmentId` set.

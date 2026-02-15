# Salesforce Sync (MVP)

This document describes the push/pull and conflict policy for syncing with Salesforce.

## Data model

- **Company**: `salesforceId` (optional) — Salesforce Account Id. Set when we create or match an Account in Salesforce, or when we pull an Account and link it.
- **Contact**: `salesforceId` (optional) — Salesforce Contact or Lead Id. Set when we push a contact to Salesforce or pull one and link it.

## Push to Salesforce

When the user approves an action or when we create/update data:

1. **Contacts**: New contacts (no `salesforceId`) can be pushed as Contact or Lead. Store the returned Salesforce Id in `contact.salesforceId`.
2. **Activities**: Emails sent and meetings booked (from Approval queue execution) can be pushed as Task or custom Activity object. Link to Contact/Account by `salesforceId` when present.
3. **Opportunities**: When we have CompanyProduct with status OPPORTUNITY and opportunitySize, push or update an Opportunity in Salesforce linked to the Account. Map internal stage to Salesforce opportunity stage.

**Implementation note**: Use the Salesforce REST API or JS SDK with OAuth. Env: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_REDIRECT_URI`, and stored refresh token per user/org. Push can be triggered from the Approval queue approve handler (after sending email / creating event) or from a dedicated “Sync to Salesforce” action.

## Pull from Salesforce

To populate or refresh data from Salesforce:

1. **Accounts**: Pull Accounts (e.g. by filter or list view). For each Account, match to existing Company by `salesforceId` first, then by domain or name. Update Company fields (name, industry, etc.) and set `company.salesforceId` if not set.
2. **Contacts**: Pull Contacts/Leads for an Account. For each, match to existing Contact by `contact.salesforceId` or by `email` + `companyId`. Update contact fields and set `contact.salesforceId` if not set. Use for “Import from Salesforce” in Build Contact List.
3. **ARR / opportunity status**: Pull Opportunity records for the Account to refresh pipeline (opportunitySize, stage). Map Salesforce stage to internal ProductOwnershipStatus or funnel stage.

## Conflict resolution

- **Match order**: When pulling, always match by Salesforce Id first (`company.salesforceId`, `contact.salesforceId`). If no Id, match Contact by `email` + `companyId`; match Company by domain or normalized name.
- **When both sides have the same entity** (we have a Contact with email X and Salesforce has a Contact with same email for same Account): **Ours wins** for MVP — we update our record’s `salesforceId` to the Salesforce Id and optionally overwrite our fields with Salesforce values, or **Salesforce wins** — overwrite our contact’s name/title/phone with Salesforce values and set `salesforceId`. Document the choice in code (e.g. config or constant: `CONFLICT_CONTACT = 'salesforce_wins'`).
- **When we have a contact and Salesforce doesn’t**: Push as new Contact/Lead and set `salesforceId` after create.
- **When Salesforce has a contact we don’t**: Create local Contact, set `salesforceId`, and link to Company (match Company by Account Id or domain).

## Recommended MVP rule

- **Contact conflict**: **Salesforce wins** — on pull, if we find a match by email+company, update our contact’s name, title, phone, and `salesforceId` from Salesforce.
- **Company conflict**: **Salesforce wins** — on pull, if we match by domain or name, update our company’s name/industry and set `salesforceId`.

Implement push/pull in `lib/salesforce/` (or `app/api/integrations/salesforce/`) with the above rules. Optional: webhook from Salesforce on Account/Contact/Opportunity change to trigger a pull for that record.

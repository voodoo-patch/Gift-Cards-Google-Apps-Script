# Gift Cards Google Apps Script

An owner-only Google Apps Script web application for managing gift cards from a Google Sheet. It supports secure card-code generation, card creation, expiration, redemption, recipient confirmation emails with inline QR codes, printable cards, daily Google Drive backups, and recovery procedures.

The customer-facing and owner-facing interface is in Italian. Source code and operational documentation are in English.

## Repository layout

| Path | Purpose |
| --- | --- |
| [`apps-script/`](apps-script/) | Every source file and manifest that must be manually uploaded to the Apps Script project. |
| [`GOOGLE_SHEET_SETUP.md`](GOOGLE_SHEET_SETUP.md) | Required Sheet migration, script-property, authorization, deployment, backup, and recovery instructions. |
| [`gift-card app plan.md`](gift-card%20app%20plan.md) | Original project requirements and background. |

## Getting started

1. Read and follow [`GOOGLE_SHEET_SETUP.md`](GOOGLE_SHEET_SETUP.md) in order.
2. Create or open the spreadsheet-bound Apps Script project.
3. Upload every `.gs` and `.html` file from [`apps-script/`](apps-script/) and replace the Apps Script manifest with [`apps-script/appsscript.json`](apps-script/appsscript.json).
4. Configure the required Script Properties (`OWNER_EMAIL`, `SPREADSHEET_ID`, and `BACKUP_FOLDER_ID`).
5. Authorize the email and QR-request scopes, then deploy the web app with owner-only access.

Do not commit Script Property values, web-app URLs, spreadsheet IDs, Drive folder IDs, or customer data to this repository.

## Local development

This repository contains Apps Script source only; it has no local build or test toolchain. After changes, manually upload the affected files from [`apps-script/`](apps-script/) and create a new Apps Script deployment version. The deployment and verification checklist is maintained in [`GOOGLE_SHEET_SETUP.md`](GOOGLE_SHEET_SETUP.md).

## Security model

The web app is intended for the configured owner only. It must be deployed with the most restrictive Google access setting, and the `OWNER_EMAIL` Script Property supplies an additional server-side check. QR links identify cards but do not grant access.

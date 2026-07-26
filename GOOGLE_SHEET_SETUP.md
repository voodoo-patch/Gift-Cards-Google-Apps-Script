# Google Sheet, deployment, backup, and recovery setup

## 1. Prepare the spreadsheet

1. Make a manual copy of the current spreadsheet before changing it.
2. Open the `Gift Cards` sheet and make row 1 match these headers exactly. The server resolves columns by header name, so their order may vary, but this order preserves the existing layout:

   | Column | Header |
   | --- | --- |
   | A | `Codice Card` |
   | B | `Valore` |
   | C | `Creata il` |
   | D | `Riscattata` |
   | E | `Riscattata il` |
   | F | `Note` |
   | G | `Scadenza` |
   | H | `Email destinatario` |
   | I | `QRLink` |
   | J | `QRCode` |

3. If the old QR columns are G and H, insert two columns before them, then label the new columns `Scadenza` and `Email destinatario`. Existing QR formulas will move to I and J automatically. For an existing recipient-email column, the app also recognizes `Email del destinatario`, `Email recipient`, `Recipient email`, and `Email`; keep only one of these headers to avoid ambiguity.
4. Fill `Scadenza` for every existing card. Use its creation date plus two years unless a different agreed expiry applies. A blank expiration date is treated as active, so do not leave legacy rows blank.
5. Format `Valore` as Euro currency, and `Creata il`, `Riscattata il`, and `Scadenza` as dates.
6. In `I2`, use the following formula, replacing the placeholder with the deployed web-app URL:

   ```none
   =ARRAYFORMULA(IF(A2:A="","", "https://SCRIPT_DEPLOYMENT_ID/exec?card=" & A2:A))
   ```

7. In `J2`, use the existing QR formula:

   ```none
   =ARRAYFORMULA(IF(I2:I="","",IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" & ENCODEURL(I2:I))))
   ```

   This sends the protected redeem URL to the QR rendering service. The URL does not grant access: the deployment and application both require the owner account.

## 2. Configure the Apps Script project

1. Open **Extensions > Apps Script** from the spreadsheet and upload every `.gs` and `.html` source file from the repository's `apps-script` folder. Replace the project manifest with `apps-script/appsscript.json`.
2. In **Project Settings > Script properties**, add:
   - `OWNER_EMAIL`: the exact Google account email for the shop owner.
   - `SPREADSHEET_ID`: the ID of the source `Gift Cards` spreadsheet. This is required because a web-app request has no dependable active spreadsheet.
   - `BACKUP_FOLDER_ID`: the Google Drive folder ID dedicated to backups.
   - `WEB_APP_URL`: optional fallback for execution contexts where Apps Script cannot determine the deployed URL.
3. Save the project and authorize the spreadsheet, Drive, email, external QR request, trigger, and user-email scopes when prompted.

## 3. Deploy owner-only web access

1. Select **Deploy > New deployment > Web app**.
2. Choose the owner account for execution and select the most restrictive access option that permits only that owner account. Do not choose anonymous, public, domain-wide, or customer access.
3. Deploy, copy the `/exec` URL, and replace `https://SCRIPT_DEPLOYMENT_ID/exec` in the `QRLink` formula with it.
4. If needed, also set that URL as `WEB_APP_URL` and save the project.
5. Open the deployed URL while signed in as the owner. Verify that a different account is refused before placing any QR code on a card.

The deployment restriction is the primary access control. `OWNER_EMAIL` supplies a second server-side check for `google.script.run` methods.

## 4. Customize the email templates

Edit `ConfirmationEmailHtml.html` and `ConfirmationEmailText.html` in the Apps Script project, then create a new deployment version.

The supported placeholders are:

- `{{cardCode}}`
- `{{cardValue}}`
- `{{expirationDate}}`
- `{{redeemUrl}}`
- `{{recipientEmail}}`

Do not add untrusted HTML directly to the HTML template. Card data is escaped before replacement.

## 5. Authorize confirmation email delivery

Apps Script requires the project owner to explicitly approve new permissions after adding or changing scopes. Without this approval, card creation succeeds but email delivery fails with a `MailApp.sendEmail` or `UrlFetchApp.fetch` permission error.

1. Save the updated source files, including `appsscript.json`, in the Apps Script project.
2. Reload the source spreadsheet so the **Carte regalo** menu refreshes.
3. Select **Carte regalo > Autorizza invio email**.
4. Complete Google's authorization prompt while signed in as the configured `OWNER_EMAIL`. Approve email sending and external-request permissions. The action checks both permissions by fetching a harmless QR image without sending an email.
5. If no prompt appears or the action reports a permission error, open the Apps Script editor, select `authorizeEmailSending` in the function list, click **Run**, and complete the authorization flow there as the configured owner.
6. Create a new web-app deployment version after the authorization succeeds. Existing deployments do not automatically include the updated code or scopes.
7. Create a test card with a recipient email and verify that the received message contains the embedded QR image.

For an active card with a recipient email, the card-detail page provides **Reinvia conferma email**. It uses the address currently stored in the Sheet and does not send messages for redeemed or expired cards.

## 6. Install and verify backups

1. Create a private Google Drive folder exclusively for spreadsheet backups and set its ID as `BACKUP_FOLDER_ID`.
2. In the spreadsheet, reload the page and use **Carte regalo > Installa backup giornaliero** once.
3. Use **Carte regalo > Crea backup adesso** to make an initial test backup.
4. Check that the Drive folder contains a timestamped copy and that **Apps Script > Triggers** contains one daily `backupGiftCardSpreadsheet_` trigger.
5. Reauthorize the trigger after changing its account or relevant Drive permissions. The service never removes old backups automatically.

## 7. Recover from a backup

1. In the backup folder, identify the latest timestamped spreadsheet copy that contains the required card record.
2. Make a new working copy of that backup; keep the original backup immutable.
3. Confirm the required headers, formulas, and date/currency formatting described above.
4. Open its bound Apps Script project and set `SPREADSHEET_ID` to the restored copy's ID.
5. Reconfigure `BACKUP_FOLDER_ID`, run **Installa backup giornaliero**, then create a fresh web-app deployment.
6. Replace the QRLink deployment URL formula with the new `/exec` URL.
7. Verify the card list, an active card, a redeemed card, the print page, and a new backup before using the restored app.

Perform this recovery exercise periodically with a non-production copy so the procedure and account permissions remain known.

# Gift Card App - Google App Script + Google Sheets

A web app capable of managing gift cards for a small family business.

The main features are:
- creating gift cards, setting a value, creation date, a QR code with a link for redemption
- Unique random card code generation, required to avoid guessing
- redeeming gift cards via Web App

## Existing implementation

The web app is currently backed by a Google Sheet that stores the data in a table.

Table format:

| Codice Card	| Valore	| Creata il	| Riscattata	| Riscattata il	| Note	| QRLink	| QRCode |
|--|---|---|---|---|---|---|---|
| BCK-<8 random chars>	| <amount in euros>	| <creation date>	| <boolean>	| <redemption date>	| <freetext note>	| =ARRAYFORMULA(IF(A2:A="",, WEBAPP_URL() & "?card=" & A2:A))	| =ARRAYFORMULA(IF(G2:G = "","",IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" & ENCODEURL(G2:G)))) |

The following App Scripts have been defined:

### CardCreator.gs

```javascript
function WEBAPP_URL() {
  return "https://script.google.com/macros/s/AKfycbygj24MJ0h9-HQt5yK1y8Xemb5KY-Dao9fybmamXaFiVQn_iZmsBvuhoBp8yToyqXB0pw/exec";
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Gift Cards")
    .addItem("Create New Card", "createNewCard")
    .addToUi();
}

function createNewCard() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Gift Cards");
  const data = sheet.getRange("A2:A").getValues();
  const nextRow = data.findIndex(r => !r[0]) + 2; // +2 because data starts at row 2

  const cardId = createUniqueCardId();

  sheet.getRange(nextRow, 1, 1, 6).setValues([[
    cardId,
    50,
    new Date(),
    false,
    "",
    ""
  ]]);

  SpreadsheetApp.getUi().alert("Created card: " + cardId);
}


function getNextAvailableRow(sheet) {
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(`A2:A${lastRow - 1}`).getValues();
  for (let i = 0; i < data.length; i++) {
    if (!data[i][0]) return i + 2; // +2 because data starts at row 2
  }
  return lastRow;
}


function generateCardId() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "BCK-";

  for (let i = 0; i < 8; i++) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  console.log(result);

  return result;
}

function cardExists(cardId) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Gift Cards");
  
  const values = sheet
    .getRange("A:A")
    .getValues()
    .flat();

  return values.includes(cardId);
}

function createUniqueCardId() {
  let cardId;

  do {
    cardId = generateCardId();
  } 
  while (cardExists(cardId));

  return cardId;
}
```

### RedeemApi.gs

```javascript
const tableIndexes = {
  cardId: 0,
  value: 1,
  createdAt: 2,
  redeemed: 3,
  redeemedOn: 4,
  notes: 5,
  link: 6
};

function doGet(e) {
  const cardId = e.parameter.card;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Gift Cards");
  const data = sheet.getDataRange().getValues();
  const url = ScriptApp.getService().getUrl();

  var cardRow = data.find(row => row[tableIndexes.cardId] == cardId);
  if (!cardRow) {    
    return HtmlService.createHtmlOutput("Card not found");
  }
  const redeemed = cardRow[tableIndexes.redeemed];
  const redeemedOn = cardRow[tableIndexes.redeemedOn];

  let html = `
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${getStyle()}
    ${getScript()}
  </head>
  <body>
    <div class="card">
      <h1>Gift Card</h1>
      <input type="hidden" id="cardId" value="${cardId}">
      <div id="redeemStatus"></div>
      <p><b>Card:</b> ${cardId}</p>
      <p><b>Value:</b> £${cardRow[tableIndexes.value]}</p>
      <p><b>Redeemed:</b> <span id="redeemedValue">${redeemed ? "Yes" : "No"}</span></p>
      <p><b>Redeemed On:</b> <span id="redeemedOnValue">${redeemed ? redeemedOn.toLocaleString("it-IT") : "-"}</span></p>
  `;

  if (!redeemed) {
    html += `
      <button class="btn" onclick="redeemCard()">Riscatta Card</button>
    `;
  }

  html += `
    </div>
  </body>
  </html>
  `;

  return HtmlService.createHtmlOutput(html);
}

function doPost(e) {
  const cardId = e.parameter.card;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Gift Cards");
  const data = sheet.getDataRange().getValues();

  var cardRowIndex = data.findIndex(row => row[tableIndexes.cardId] == cardId);
  if (cardRowIndex === -1) {    
    return HtmlService.createHtmlOutput("Card not found");
  }
  sheet.getRange(cardRowIndex + 1, tableIndexes.redeemed + 1).setValue(true);
  sheet.getRange(cardRowIndex + 1, tableIndexes.redeemedOn + 1).setValue(new Date());
  
  const output = { success: true };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStyle(){
  return `
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
        background: #f7f7f7;
        color: #333;
        font-size: 1.4em;
      }
      .card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 500px;
        margin: auto;
      }
      h1 {
        margin-top: 0;
        text-align: center;
      }
      .success {
        background: #e6ffe6;
        border-left: 4px solid #2ecc71;
        padding: 10px 15px;
        margin-bottom: 15px;
        border-radius: 6px;
        font-weight: bold;
        color: #2e7d32;
        animation: fadeOut 3s forwards;
      }
      @keyframes fadeOut {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      .btn {
        display: block;
        width: 100%;
        padding: 12px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        margin-top: 20px;
        cursor: pointer;
      }
      .btn:active {
        background: #005fcc;
      }
    </style>
  `;
}

function getScript(){
  return `  
    <script>
      function redeemCard() {
        const cardId = document.getElementById("cardId").value;

        fetch("${WEBAPP_URL()}", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "card=" + encodeURIComponent(cardId)
        })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            // Show success banner
            document.getElementById("redeemStatus").innerHTML =
              "<div class='success'>Card successfully redeemed!</div>";

            // Update Redeemed field
            document.getElementById("redeemedValue").textContent = "Yes";

            // Update Redeemed On field with current timestamp
            const now = new Date().toLocaleString("it-IT");
            document.getElementById("redeemedOnValue").textContent = now;

            // Hide the redeem button
            const btn = document.querySelector(".btn");
            if (btn) btn.style.display = "none";
          }
        });
      }
    </script>
  `;
}

```

## Constraints

- The web app should never be accessible by anyone else other than the sheet owner - this is only meant to be used by the shop owner
- The Web app needs to securely store cards detail in a persistent way, and ideally it should support data recovery in case of corruption. We cannot afford losing track of customers purchases.
- The redemption page needs to be mobile first, as it relies on the user scanning a QR code with their phone, and then redeeming the card from their phone.

## Current Issues and limitations

- The redemption ui is bugged, as it tries to invoke the doPost method of the web app, which is not allowed by Google Apps Script. I want to fix this by using  `google.script.run` instead, instead of calling the web app endpoint directly.
- The UI is currently mixing english and italian. The consumers of the app will be italian, so the UI should be fully translated to italian. The implementation code should be in english.
- The create new card button is only available in the Google Sheet menu, but it should be available in the web app as well, as a button on the top right corner of the card list page.
- The HTML/CSS/JS code is currently embedded in the Apps Script code, which makes it hard to maintain. It should be moved to separate HTML files and loaded dynamically.

## Features to add

### Card list UI

A UI to display the list of cards. 
The layout should have 2 tabs: Active and Redeemed.

Each card entry should have a button to see the detail of the card, which should open the existing card details page, where operations like "redemption" and "share to email" are available depending on the status.

This should be the homepage, and also have a button in the top right corner to Create a new card.
The create card button should open a dedicated page as explained below.

### New Card Page

The page opens up with a form with the following inputs available:
- card code - unique identifier, prepopulated
- Expiration date - preset with current date + 2 years
- Card value - prepopulated with 50 euros
- recipient email - optional field, used to send confirmation email to the recipient, containing the summary of the card

Then a button "create" allows the user to finalize the creation of the card, adding the row to the sheet, and sends the recap email to the recipient if present.

If successful, the user is redirected to the card list page.

### Card Expiration

The current implementation does not support card expiration. We should add a new column to the sheet to store the expiration date, and the redemption logic should check if the card is expired before allowing redemption.

The default validity period for a card should be 2 years from the creation date, but it should be possible to set a custom expiration date when creating the card.

### Confirmation Email

When a new card is created, if the recipient email is provided, the app should send a confirmation email to the recipient with the card details, including the card code, value, expiration date, and a link to redeem the card.

The email template should be customizable, and it should support both plain text and HTML formats.

### Printable Card

When a new card is created, the app should generate a printable version of the card, which includes the card code, value, expiration date, and a QR code for redemption. The printable card should be available as a PDF (or printable HTML) that can be downloaded or printed directly from the web app.
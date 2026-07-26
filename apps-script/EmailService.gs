function sendConfirmationEmail_(card) {
  const templateData = {
    cardCode: card.cardCode,
    cardValue: card.valueLabel,
    expirationDate: card.expirationDate,
    redeemUrl: card.redeemUrl,
    recipientEmail: card.recipientEmail
  };
  const subject = `La tua carta regalo ${card.cardCode}`;
  const plainText = renderEmailTemplate_('ConfirmationEmailText', templateData, false);
  const html = renderEmailTemplate_('ConfirmationEmailHtml', templateData, true);
  const qrCodeImage = getQrCodeImageBlob_(card.redeemUrl, card.cardCode);

  MailApp.sendEmail({
    to: card.recipientEmail,
    subject,
    body: plainText,
    htmlBody: html,
    inlineImages: {
      giftCardQr: qrCodeImage
    },
    name: 'Carte regalo'
  });
}

function authorizeEmailSending() {
  assertOwner_();
  MailApp.getRemainingDailyQuota();
  getQrCodeImageBlob_('https://example.invalid/gift-card-authorization', 'authorization-check');
  SpreadsheetApp.getUi().alert('L invio email e la generazione del codice QR sono stati autorizzati.');
}

function getQrCodeImageBlob_(redeemUrl, cardCode) {
  const response = UrlFetchApp.fetch(getQrCodeUrl_(redeemUrl), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error(`QR code request failed with status ${response.getResponseCode()}.`);
  }

  return response.getBlob().setName(`${cardCode}-qr.png`);
}

function renderEmailTemplate_(templateName, data, htmlEscapeValues) {
  let content = HtmlService.createHtmlOutputFromFile(templateName).getContent();
  Object.keys(data).forEach((key) => {
    const value = htmlEscapeValues ? escapeHtml_(data[key]) : String(data[key]);
    content = content.split(`{{${key}}}`).join(value);
  });
  return content;
}

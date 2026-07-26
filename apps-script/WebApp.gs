function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Carte regalo')
    .addItem('Crea carta predefinita', 'createNewCard')
    .addItem('Autorizza invio email', 'authorizeEmailSending')
    .addSeparator()
    .addItem('Crea backup adesso', 'createBackupNow')
    .addItem('Installa backup giornaliero', 'installDailyBackupTrigger')
    .addToUi();
}

function doGet(event) {
  try {
    assertOwner_();
    const parameters = (event && event.parameter) || {};
    const requestedPage = parameters.page || (parameters.card ? 'details' : 'list');
    const page = String(requestedPage).toLowerCase();

    if (page === 'list') {
      return renderPage_('CardList', 'Carte regalo', {});
    }
    if (page === 'new') {
      return renderPage_('NewCard', 'Crea carta regalo', {});
    }
    if (page === 'details' || page === 'print') {
      const cardCode = normalizeCardCode_(parameters.card);
      assertValidCardCode_(cardCode);
      if (page === 'print') {
        const card = getCardDetails(cardCode);
        card.qrCodeUrl = getQrCodeUrl_(card.redeemUrl);
        return renderPage_('PrintCard', 'Carta regalo', { card });
      }
      return renderPage_('CardDetail', 'Carta regalo', { cardCode });
    }

    return renderErrorPage_('Pagina non trovata.');
  } catch (error) {
    console.error(`Web app request failed: ${error.message}`);
    return renderErrorPage_('Accesso non autorizzato o configurazione non completata.');
  }
}

function renderPage_(templateName, title, properties) {
  const template = HtmlService.createTemplateFromFile(templateName);
  template.title = title;
  template.appUrl = getWebAppUrl_();
  Object.keys(properties).forEach((key) => {
    template[key] = properties[key];
  });

  return template
    .evaluate()
    .setTitle(title);
}

function renderErrorPage_(message) {
  const template = HtmlService.createTemplateFromFile('Error');
  template.message = message;
  return template.evaluate().setTitle('Carte regalo');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

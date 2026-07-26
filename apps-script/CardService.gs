function getCardList() {
  assertOwner_();

  const sheet = getGiftCardSheet_();
  const columnMap = getCardColumnMap_(sheet);
  return getCardRows_(sheet, columnMap)
    .map((entry) => cardRowToObject_(entry.values, columnMap, entry.displayValues))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((card) => serializeCard_(card, false, false, true));
}

function getCardDetails(cardCode) {
  assertOwner_();

  const normalizedCode = normalizeCardCode_(cardCode);
  assertValidCardCode_(normalizedCode);
  const sheet = getGiftCardSheet_();
  const columnMap = getCardColumnMap_(sheet);
  const entry = getCardByCode_(sheet, columnMap, normalizedCode);
  if (!entry) {
    throw new Error('Carta regalo non trovata.');
  }

  return serializeCard_(entry.card, true);
}

function getNewCardDefaults() {
  assertOwner_();

  const date = new Date();
  date.setFullYear(date.getFullYear() + APP_CONFIG.defaultValidityYears);
  return {
    cardCode: generateAvailableCardCode_(),
    value: APP_CONFIG.defaultValue,
    expirationDate: toIsoDate_(date)
  };
}

function createCard(input) {
  assertOwner_();

  const card = validateNewCardInput_(input);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getGiftCardSheet_();
    const columnMap = getCardColumnMap_(sheet);
    if (getCardByCode_(sheet, columnMap, card.cardCode)) {
      throw new Error('Il codice della carta e gia in uso. Generarne uno nuovo e riprovare.');
    }

    const rowNumber = findNextAvailableCardRow_(sheet, columnMap);
    writeNewCard_(sheet, columnMap, rowNumber, card);
  } finally {
    lock.releaseLock();
  }

  const result = {
    card: serializeCard_({ ...card, redeemed: false, redeemedAt: null, notes: '', status: 'active' }, true),
    email: { attempted: false, sent: false }
  };
  if (!card.recipientEmail) {
    return result;
  }

  result.email.attempted = true;
  try {
    sendConfirmationEmail_(result.card);
    result.email.sent = true;
  } catch (error) {
    console.error(`Confirmation email failed for card ${card.cardCode}: ${error.message}`);
    result.email.error = 'La carta e stata creata, ma non e stato possibile inviare l email di conferma.';
  }

  return result;
}

function redeemCard(cardCode) {
  assertOwner_();

  const normalizedCode = normalizeCardCode_(cardCode);
  assertValidCardCode_(normalizedCode);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getGiftCardSheet_();
    const columnMap = getCardColumnMap_(sheet);
    const entry = getCardByCode_(sheet, columnMap, normalizedCode);
    if (!entry) {
      throw new Error('Carta regalo non trovata.');
    }
    if (entry.card.redeemed) {
      throw new Error('Questa carta regalo e gia stata riscattata.');
    }
    if (entry.card.status === 'expired') {
      throw new Error('Questa carta regalo e scaduta e non puo essere riscattata.');
    }

    const redeemedAt = new Date();
    sheet.getRange(entry.rowNumber, columnMap.redeemed).setValue(true);
    sheet.getRange(entry.rowNumber, columnMap.redeemedAt).setValue(redeemedAt);
    entry.card.redeemed = true;
    entry.card.redeemedAt = redeemedAt;
    entry.card.status = 'redeemed';
    return serializeCard_(entry.card, true);
  } finally {
    lock.releaseLock();
  }
}

function resendConfirmationEmail(cardCode) {
  assertOwner_();

  const normalizedCode = normalizeCardCode_(cardCode);
  assertValidCardCode_(normalizedCode);
  const sheet = getGiftCardSheet_();
  const columnMap = getCardColumnMap_(sheet);
  const entry = getCardByCode_(sheet, columnMap, normalizedCode);
  if (!entry) {
    throw new Error('Carta regalo non trovata.');
  }
  if (entry.card.status !== 'active') {
    throw new Error('La conferma email puo essere reinviata solo per una carta attiva.');
  }
  if (!entry.card.recipientEmail) {
    throw new Error('Questa carta non ha un indirizzo email del destinatario.');
  }
  if (!isValidEmail_(entry.card.recipientEmail)) {
    throw new Error('L indirizzo email del destinatario non e valido.');
  }

  sendConfirmationEmail_(serializeCard_(entry.card, true));
  return { success: true };
}

function createNewCard() {
  assertOwner_();

  const defaults = getNewCardDefaults();
  const result = createCard(defaults);
  SpreadsheetApp.getUi().alert(`Carta creata: ${result.card.cardCode}`);
}

function validateNewCardInput_(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('I dati della carta non sono validi.');
  }

  const cardCode = normalizeCardCode_(input.cardCode);
  assertValidCardCode_(cardCode);

  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0 || value > 1000000) {
    throw new Error('Il valore della carta deve essere maggiore di zero.');
  }

  const expirationDate = parseDateInput_(input.expirationDate);
  if (expirationDate < getTodayStart_()) {
    throw new Error('La data di scadenza non puo essere nel passato.');
  }

  const recipientEmail = String(input.recipientEmail || '').trim();
  if (!isValidEmail_(recipientEmail)) {
    throw new Error('L indirizzo email del destinatario non e valido.');
  }

  return {
    cardCode,
    value,
    createdAt: new Date(),
    expirationDate,
    recipientEmail
  };
}

function generateAvailableCardCode_() {
  const sheet = getGiftCardSheet_();
  const columnMap = getCardColumnMap_(sheet);
  const existingCodes = getExistingCardCodes_(sheet, columnMap);
  let cardCode;
  do {
    cardCode = generateCardCode_();
  } while (existingCodes.has(cardCode));

  return cardCode;
}

function generateCardCode_() {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${Utilities.getUuid()}:${new Date().getTime()}`
  );
  let result = APP_CONFIG.cardPrefix;
  for (let index = 0; index < APP_CONFIG.cardCodeLength; index += 1) {
    result += CARD_CODE_ALPHABET.charAt((digest[index] & 0xff) & 31);
  }
  return result;
}

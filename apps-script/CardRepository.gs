function getGiftCardSpreadsheet_() {
  const configuredId = getRequiredScriptProperty_(APP_CONFIG.propertyNames.spreadsheetId);
  return SpreadsheetApp.openById(configuredId);
}

function getGiftCardSheet_() {
  const sheet = getGiftCardSpreadsheet_().getSheetByName(APP_CONFIG.sheetName);
  if (!sheet) {
    throw new Error(`Missing required sheet: ${APP_CONFIG.sheetName}.`);
  }

  return sheet;
}

function getCardColumnMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) {
    throw new Error('The Gift Cards sheet has no header row.');
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const columnMap = {};
  REQUIRED_CARD_COLUMNS.forEach((key) => {
    const index = findCardColumnIndex_(headers, key);
    if (index === -1) {
      throw new Error(`Missing required card column: ${CARD_COLUMNS[key]}.`);
    }
    columnMap[key] = index + 1;
  });

  return columnMap;
}

function findCardColumnIndex_(headers, key) {
  const allowedHeaders = CARD_COLUMN_HEADER_ALIASES[key] || [CARD_COLUMNS[key]];
  const normalizedAllowedHeaders = allowedHeaders.map(normalizeColumnHeader_);
  const matchingIndexes = headers
    .map(normalizeColumnHeader_)
    .map((header, index) => normalizedAllowedHeaders.includes(header) ? index : -1)
    .filter((index) => index !== -1);

  if (matchingIndexes.length > 1) {
    throw new Error(
      `Multiple columns match ${CARD_COLUMNS[key]}. Keep only one of: ${allowedHeaders.join(', ')}.`
    );
  }

  return matchingIndexes.length ? matchingIndexes[0] : -1;
}

function normalizeColumnHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getCardRows_(sheet, columnMap) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  return values
    .map((row, index) => ({
      rowNumber: index + 2,
      values: row,
      displayValues: displayValues[index]
    }))
    .filter((entry) => entry.values[columnMap.cardCode - 1]);
}

function getCardByCode_(sheet, columnMap, cardCode) {
  const matchingEntry = getCardRows_(sheet, columnMap)
    .find((entry) => normalizeCardCode_(entry.values[columnMap.cardCode - 1]) === cardCode);

  return matchingEntry
    ? {
      rowNumber: matchingEntry.rowNumber,
      card: cardRowToObject_(matchingEntry.values, columnMap, matchingEntry.displayValues)
    }
    : null;
}

function getExistingCardCodes_(sheet, columnMap) {
  return new Set(
    getCardRows_(sheet, columnMap)
      .map((entry) => normalizeCardCode_(entry.values[columnMap.cardCode - 1]))
  );
}

function findNextAvailableCardRow_(sheet, columnMap) {
  const lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow < 2) {
    return 2;
  }

  const values = sheet.getRange(2, columnMap.cardCode, lastRow - 1, 1).getValues();
  const emptyOffset = values.findIndex((row) => !row[0]);
  return emptyOffset === -1 ? lastRow + 1 : emptyOffset + 2;
}

function writeNewCard_(sheet, columnMap, rowNumber, card) {
  sheet.getRange(rowNumber, columnMap.cardCode).setValue(card.cardCode);
  sheet.getRange(rowNumber, columnMap.value).setValue(card.value);
  sheet.getRange(rowNumber, columnMap.createdAt).setValue(card.createdAt);
  sheet.getRange(rowNumber, columnMap.redeemed).setValue(false);
  sheet.getRange(rowNumber, columnMap.redeemedAt).clearContent();
  sheet.getRange(rowNumber, columnMap.notes).setValue('');
  sheet.getRange(rowNumber, columnMap.expirationDate).setValue(card.expirationDate);
  sheet.getRange(rowNumber, columnMap.recipientEmail).setValue(card.recipientEmail || '');
}

function cardRowToObject_(row, columnMap, displayValues) {
  const createdAt = dateFromCell_(row[columnMap.createdAt - 1]);
  const redeemedAt = dateFromCell_(row[columnMap.redeemedAt - 1]);
  const expirationDate = dateFromCell_(row[columnMap.expirationDate - 1]);
  const redeemedValue = row[columnMap.redeemed - 1];
  const redeemed = redeemedValue === true || String(redeemedValue).toLowerCase() === 'true';
  const cardCode = normalizeCardCode_(row[columnMap.cardCode - 1]);

  return {
    cardCode,
    value: Number(row[columnMap.value - 1]),
    createdAt,
    redeemed,
    redeemedAt,
    notes: String(row[columnMap.notes - 1] || ''),
    expirationDate,
    recipientEmail: String(
      (displayValues && displayValues[columnMap.recipientEmail - 1]) ||
      row[columnMap.recipientEmail - 1] ||
      ''
    ).trim(),
    status: getCardStatus_(redeemed, expirationDate)
  };
}

function getCardStatus_(redeemed, expirationDate) {
  if (redeemed) {
    return 'redeemed';
  }

  return expirationDate && expirationDate < getTodayStart_() ? 'expired' : 'active';
}

function serializeCard_(card, includePrivateFields, includeRedeemUrl, includeRecipientEmail) {
  const serialized = {
    cardCode: card.cardCode,
    value: card.value,
    valueLabel: formatCurrency_(card.value),
    createdAt: formatDate_(card.createdAt),
    expirationDate: formatDate_(card.expirationDate),
    redeemed: card.redeemed,
    redeemedAt: formatDateTime_(card.redeemedAt),
    status: card.status
  };

  if (includeRedeemUrl !== false) {
    serialized.redeemUrl = getCardRedeemUrl_(card.cardCode);
  }

  if (includePrivateFields) {
    serialized.notes = card.notes;
    serialized.recipientEmail = card.recipientEmail;
  } else if (includeRecipientEmail) {
    serialized.recipientEmail = card.recipientEmail;
  }

  return serialized;
}

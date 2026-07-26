const APP_CONFIG = Object.freeze({
  sheetName: 'Gift Cards',
  cardPrefix: 'BCK-',
  cardCodeLength: 8,
  defaultValue: 50,
  defaultValidityYears: 2,
  propertyNames: Object.freeze({
    ownerEmail: 'OWNER_EMAIL',
    spreadsheetId: 'SPREADSHEET_ID',
    backupFolderId: 'BACKUP_FOLDER_ID',
    webAppUrl: 'WEB_APP_URL'
  })
});

const CARD_COLUMNS = Object.freeze({
  cardCode: 'Codice Card',
  value: 'Valore',
  createdAt: 'Creata il',
  redeemed: 'Riscattata',
  redeemedAt: 'Riscattata il',
  notes: 'Note',
  expirationDate: 'Scadenza',
  recipientEmail: 'Email destinatario',
  qrLink: 'QRLink',
  qrCode: 'QRCode'
});

const CARD_COLUMN_HEADER_ALIASES = Object.freeze({
  recipientEmail: Object.freeze([
    'Email destinatario',
    'Email del destinatario',
    'Email recipient',
    'Recipient email',
    'Email'
  ])
});

const REQUIRED_CARD_COLUMNS = Object.freeze(Object.keys(CARD_COLUMNS));
const CARD_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CARD_CODE_PATTERN = /^BCK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRequiredScriptProperty_(propertyName) {
  const value = PropertiesService.getScriptProperties().getProperty(propertyName);
  if (!value) {
    throw new Error(`Missing required script property: ${propertyName}.`);
  }

  return value.trim();
}

function getWebAppUrl_() {
  const deployedUrl = ScriptApp.getService().getUrl();
  return deployedUrl || getRequiredScriptProperty_(APP_CONFIG.propertyNames.webAppUrl);
}

function getCardRedeemUrl_(cardCode) {
  return `${getWebAppUrl_()}?card=${encodeURIComponent(cardCode)}`;
}

function getQrCodeUrl_(redeemUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(redeemUrl)}`;
}

function normalizeCardCode_(value) {
  return String(value || '').trim().toUpperCase();
}

function assertValidCardCode_(cardCode) {
  if (!CARD_CODE_PATTERN.test(cardCode)) {
    throw new Error('Il codice della carta non e valido.');
  }
}

function isValidEmail_(email) {
  return !email || EMAIL_PATTERN.test(email);
}

function parseDateInput_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('La data di scadenza non e valida.');
  }

  const parts = value.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  if (
    date.getFullYear() !== parts[0] ||
    date.getMonth() !== parts[1] - 1 ||
    date.getDate() !== parts[2]
  ) {
    throw new Error('La data di scadenza non e valida.');
  }

  return date;
}

function dateFromCell_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function getTodayStart_() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function toIsoDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatDate_(date) {
  return date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy') : '-';
}

function formatDateTime_(date) {
  return date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '-';
}

function formatCurrency_(value) {
  return `${Number(value).toFixed(2).replace('.', ',')} EUR`;
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createBackupNow() {
  assertOwner_();
  return backupGiftCardSpreadsheet_();
}

function backupGiftCardSpreadsheet_() {
  const folderId = getRequiredScriptProperty_(APP_CONFIG.propertyNames.backupFolderId);
  const source = getGiftCardSpreadsheet_();
  const folder = DriveApp.getFolderById(folderId);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const copy = DriveApp.getFileById(source.getId())
    .makeCopy(`${source.getName()} backup ${timestamp}`, folder);

  console.log(`Gift card backup created: ${copy.getId()}`);
  return {
    id: copy.getId(),
    name: copy.getName(),
    url: copy.getUrl()
  };
}

function installDailyBackupTrigger() {
  assertOwner_();

  const matchingTriggers = ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'backupGiftCardSpreadsheet_');
  matchingTriggers.slice(1).forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  if (!matchingTriggers.length) {
    ScriptApp.newTrigger('backupGiftCardSpreadsheet_')
      .timeBased()
      .everyDays(1)
      .atHour(2)
      .create();
  }
}

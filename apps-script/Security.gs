function assertOwner_() {
  const ownerEmail = getRequiredScriptProperty_(APP_CONFIG.propertyNames.ownerEmail).toLowerCase();
  const activeEmail = Session.getActiveUser().getEmail().toLowerCase();

  if (!activeEmail || activeEmail !== ownerEmail) {
    throw new Error('Accesso non autorizzato.');
  }
}

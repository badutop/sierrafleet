// Global confirm() replacement — shows a themed dialog instead of the native browser confirm.
let handler = null;

export function setConfirmHandler(fn) {
  handler = fn;
}

export function confirm(message) {
  if (!handler) return Promise.resolve(window.confirm(message));
  return handler(message);
}
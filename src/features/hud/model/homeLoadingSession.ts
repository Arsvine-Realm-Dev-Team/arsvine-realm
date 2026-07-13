// Locale changes remount the App Router locale layout, but they do not create a
// new browser document. Keep the opening sequence scoped to that document so a
// language change never replays it.
let initialBootSequencePending = true;

export function isInitialBootSequencePending(): boolean {
  return initialBootSequencePending;
}

export function completeInitialBootSequence(): void {
  initialBootSequencePending = false;
}

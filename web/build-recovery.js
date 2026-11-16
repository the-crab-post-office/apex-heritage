// URL-scoped, one-shot recovery also works when browser storage is blocked.
const RETRY = "apex-refresh";
const RESUME = "apex-resume";
export function freshBuildURL(
  href,
  { automatic = false, resume = false, now = Date.now() } = {},
) {
  const url = new URL(href);
  if (automatic && url.searchParams.has(RETRY)) return null;
  url.searchParams.set(RETRY, String(now));
  if (resume) url.searchParams.set(RESUME, "1");
  else url.searchParams.delete(RESUME);
  return url.href;
}
export function shouldResumeRace(href) {
  return new URL(href).searchParams.get(RESUME) === "1";
}
export function cleanBuildURL(href) {
  const url = new URL(href);
  url.searchParams.delete(RETRY);
  url.searchParams.delete(RESUME);
  return url.href;
}

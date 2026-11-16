// Prevent newer HTML/terrain being silently paired with cached CSS, JS or WASM.
export function assertCompatibleBuild(info) {
  const failures = [];
  for (const key of [
    "htmlVersion",
    "cssVersion",
    "coreVersion",
    "serverVersion",
  ])
    if (info[key] !== info.version)
      failures.push(`${key}: ${info[key] || "missing"}`);
  for (const key of ["coreHash", "serverHash"])
    if (info[key] !== info.hash)
      failures.push(`${key}: ${info[key] || "missing"}`);
  if (failures.length) {
    const error = new Error(
      `Build mismatch (${failures.join("; ")}). Running ${info.version}; server ${info.serverVersion || "unavailable"}. Reload the latest build. HTML, CSS, game code and WASM must come from one build.`,
    );
    error.code = "APEX_BUILD_MISMATCH";
    error.buildInfo = { ...info };
    throw error;
  }
  return { version: info.version, hash: info.hash };
}

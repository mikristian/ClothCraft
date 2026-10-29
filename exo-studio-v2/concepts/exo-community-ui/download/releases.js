/* Explicitly curated, tested and published artifacts only. Never guess a GitHub release URL. */
const RELEASES = Object.freeze({
  mac: null,
  windows: null,
});

for (const [platform, info] of Object.entries(RELEASES)) {
  const anchor = document.getElementById(`${platform === 'windows' ? 'win' : platform}-download`);
  const status = document.getElementById(`${platform === 'windows' ? 'win' : platform}-status`);
  const note = document.getElementById(`${platform === 'windows' ? 'win' : platform}-note`);
  if (!anchor || !status || !note || !info) continue;
  if (info.verified !== true || !/^https:\/\/github\.com\/mikristian\/exo-sample-3d\/releases\/download\//.test(info.url)) continue;
  anchor.href = info.url;
  anchor.textContent = `Download ${info.label}`;
  anchor.classList.remove('is-disabled');
  anchor.removeAttribute('aria-disabled');
  status.textContent = `${info.version} available`;
  note.textContent = `Verified ${info.version} · ${info.architecture} · SHA-256 in release notes`;
}

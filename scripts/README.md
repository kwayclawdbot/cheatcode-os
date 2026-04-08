# CheatCode OS local sync scripts

## `vault_sync.py` — sync Supabase `vault_store` → local Obsidian vault

Pulls rows from the Supabase `vault_store` table and writes them as markdown
files under `~/.openclaw/vault/` on your Mac. Runs manually for one-shot
sync or as a LaunchAgent for continuous sync.

### Why

The CheatCode OS Python backend runs on Railway in an ephemeral container
without filesystem persistence. Vault notes are written to Supabase rows
(keyed by relative path) in the backend. This script runs on your Mac,
fetches those rows, and mirrors them to real files that Obsidian opens
normally — graph view, backlinks, plugins, everything works.

### One-time setup

```bash
# Install deps
pip install httpx python-dotenv

# Create .env next to the script (or export manually)
cat > ~/projects/cheatcode-os/scripts/.env <<EOF
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
VAULT_ROOT=$HOME/.openclaw/vault
EOF

# Run it once manually to verify
python3 ~/projects/cheatcode-os/scripts/vault_sync.py
```

You should see a log line like `sync complete: written=316 skipped=0`
and find markdown files under `~/.openclaw/vault/06 - Knowledge Base/CheatCode OS/`.

### Run as a LaunchAgent (recommended)

This makes sync automatic — runs at login, polls every 5 minutes.

```bash
# 1. Edit the plist — replace YOUR_USERNAME with your actual username
#    and fill in the Supabase credentials inline.
open -e ~/projects/cheatcode-os/scripts/com.cheatcode.vault-sync.plist

# 2. Copy into place
cp ~/projects/cheatcode-os/scripts/com.cheatcode.vault-sync.plist ~/Library/LaunchAgents/

# 3. Load it
launchctl load ~/Library/LaunchAgents/com.cheatcode.vault-sync.plist

# 4. Verify it's running
launchctl list | grep cheatcode

# 5. Tail the log
tail -f ~/Library/Logs/cheatcode-vault-sync.log
```

### Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.cheatcode.vault-sync.plist
rm ~/Library/LaunchAgents/com.cheatcode.vault-sync.plist
```

### Troubleshooting

- **"SUPABASE_URL and SUPABASE_SERVICE_KEY are required"**  
  Your `.env` file isn't being loaded, or the plist's `EnvironmentVariables`
  block is missing them. Check the paths in the plist — it must point to
  the real location of `vault_sync.py` and your username.

- **"fetch failed: 401"**  
  The service key is wrong. Grab it from Supabase Dashboard → Settings → API
  → Service role key (NOT the anon key if you want writes through RLS).

- **"rejected unsafe path: ..."**  
  A row in `vault_store` has a path that tries to escape `VAULT_ROOT`
  (e.g. via `..`). The script refuses these and logs a warning — investigate
  the row in Supabase, the Python backend shouldn't produce these.

- **Script runs but no files appear**  
  Check that `VAULT_ROOT` actually exists and is writable. Default is
  `~/.openclaw/vault`. Also check `~/.openclaw/.vault-sync-state.json` —
  if `last_sync` is set to a date after the newest row, no rows will be
  fetched. Delete that file to force a full refetch, or pass `--full`.

### Files & locations

| File | Purpose |
|---|---|
| `vault_sync.py` | The sync script itself |
| `com.cheatcode.vault-sync.plist` | LaunchAgent config for macOS |
| `~/.openclaw/vault/` | Target: your Obsidian vault root |
| `~/.openclaw/.vault-sync-state.json` | Last-sync timestamp tracking |
| `~/Library/Logs/cheatcode-vault-sync.log` | Application log |
| `~/Library/Logs/cheatcode-vault-sync.{out,err}.log` | LaunchAgent stdout/stderr |

# Known Limitations (v0.1, 2026-11-03)

- **Undecided rules:** the growth score and matrix stay blocked until D-29 (growth weights, matrix thresholds) is decided. The delivery score and rating are fully configured.
- **Single-browser storage:** data lives in one browser on one computer. Use encrypted backups to move it or protect it. Moving or renaming the HTML file starts a new, empty workspace, so restore from backup after a move.
- **No passphrase recovery:** if the passphrase is lost, data can only be recovered from a backup together with that backup's passphrase. Changing the passphrase is not yet available.
- **Closed-year protection:** a closed year is read-only in its screens. Reopening is not supported.
- **Audit log:** append-only within the app, but stored in the same encrypted file, so it is not tamper-proof against someone holding the passphrase.
- **Imports:** cover team, offers and requisitions. Training, feedback, projects and historical ratings are entered manually; historical ratings go in through the reviews of earlier years. Team imports cannot be undone automatically.
- **Exports:** PDF uses the browser's Print → Save as PDF.
- **AI assistance:** not included.
- **Earlier work not migrated:** data from the earlier TA dashboard and monthly workbook is not migrated automatically. Import the offers list instead.

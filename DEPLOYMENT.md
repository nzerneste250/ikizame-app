# IKIZAME Deployment Commands

Use this checklist to publish changes from the Windows development machine and update the production server.

## 1. Sync the local branch before starting work

Run in PowerShell from the project folder:

```powershell
Set-Location F:\IKIZAME-NodeApp
git switch main
git pull --ff-only origin main
```

Pull before editing. If you already have local edits, review and commit or otherwise safely handle them before pulling.

## 2. Test, commit, and push changes

After making changes, run:

```powershell
node --test test/*.js
git diff --check
git status --short
```

Stage only the files you intend to publish. Replace the example paths with the files you changed:

```powershell
git add public/index.html public/school-auth.html
git diff --cached --check
git diff --cached --stat
git commit -m "Describe the change"
git push origin main
```

Confirm the push completed before pulling on the server. If Git asks you to authenticate, complete the sign-in prompt directly.

## 3. Pull and restart the production website

Connect to the server:

```powershell
ssh root@ikizame.rw
```

Then run these commands at the server prompt:

```bash
cd /var/www/ikizame
git status --short --branch
git pull --ff-only origin main
pm2 restart ikizame --update-env
pm2 status
```

The PM2 process for the website is named `ikizame`. Restarting it directly avoids restarting the separate `izo-report` process during an ordinary website deploy.

If `package.json` or `package-lock.json` changed, install production dependencies after pulling and before restarting:

```bash
cd /var/www/ikizame
npm ci --omit=dev
```

If changes also affect the reporting process, restart it explicitly:

```bash
pm2 restart izo-report --update-env
pm2 status
```

To inspect recent website logs after restarting:

```bash
pm2 logs ikizame --lines 50
```

Press `Ctrl+C` to stop following logs; this does not stop the service.

## Quick server deploy

After the commit has been pushed, these commands can be run from PowerShell as a single SSH session:

```powershell
ssh root@ikizame.rw "cd /var/www/ikizame && git pull --ff-only origin main && pm2 restart ikizame --update-env && pm2 status"
```

## Important

- Do not use `git reset --hard` to resolve a pull problem; inspect `git status` and the Git error first.
- Do not use `pm2 restart all` for a normal website change, because it also restarts unrelated PM2 apps.
- If the server reports a merge conflict or cannot fast-forward, stop and inspect the server's local changes instead of forcing the pull.

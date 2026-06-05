$repoPath = "C:\Users\Charbel\Desktop\Claude\Foot Guru\foot-guru"
Set-Location $repoPath

$status = git status --porcelain
if (-not $status) { exit 0 }

git add -A

# Build commit message from changed files
$changed = (git diff --cached --name-only) -join ", "
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
$msg = "Auto-deploy ($date): $changed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git commit -m $msg
git push

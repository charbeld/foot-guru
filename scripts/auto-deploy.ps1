$repoPath = "C:\Users\Charbel\Desktop\Claude\Foot Guru\foot-guru"
Set-Location $repoPath

$status = git status --porcelain
if (-not $status) { exit 0 }

# Never auto-commit directly to main — require a session branch
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") {
    Write-Host "Auto-deploy skipped: on main. Run scripts/start-session.ps1 to create a session branch."
    exit 0
}

git add -A

# Build commit message from changed files
$changed = (git diff --cached --name-only) -join ", "
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
$msg = "Auto-deploy ($date): $changed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git commit -m $msg

# Push with -u in case upstream isn't set yet for this session branch
git push -u origin $branch

$repoPath = "C:\Users\Charbel\Desktop\Claude\Foot Guru\foot-guru"
Set-Location $repoPath

$status = git status --porcelain
if (-not $status) { exit 0 }

$branch = git rev-parse --abbrev-ref HEAD

# If on main, automatically create today's session branch before committing
if ($branch -eq "main") {
    $date = Get-Date -Format "yyyy-MM-dd"
    $sessionBranch = "session/$date"

    $existing = git branch --list $sessionBranch
    if ($existing) {
        git checkout $sessionBranch | Out-Null
    } else {
        git pull --quiet | Out-Null
        git checkout -b $sessionBranch | Out-Null
    }

    $branch = $sessionBranch
    Write-Host "Auto-deploy: created session branch $branch"
}

git add -A

$changed = (git diff --cached --name-only) -join ", "
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$msg = "Auto-deploy ($timestamp): $changed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git commit -m $msg
git push -u origin $branch

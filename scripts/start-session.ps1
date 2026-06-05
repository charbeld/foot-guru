$repoPath = "C:\Users\Charbel\Desktop\Claude\Foot Guru\foot-guru"
Set-Location $repoPath

# Pull latest main first
git checkout main
git pull

$date   = Get-Date -Format "yyyy-MM-dd"
$branch = "session/$date"

# Reuse the branch if it was already created today
$existing = git branch --list $branch
if ($existing) {
    git checkout $branch
    Write-Host "Resumed existing branch: $branch"
} else {
    git checkout -b $branch
    git push -u origin $branch
    Write-Host "Created session branch: $branch"
}

Write-Host ""
Write-Host "Ready. Auto-deploy will commit to $branch after each Claude turn."
Write-Host "At the end of the session, Claude will open a PR into main."

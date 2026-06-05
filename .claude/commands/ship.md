Commit all staged and unstaged changes, then push to GitHub (which auto-deploys to Vercel).

Steps:
1. Run `git status` to see what changed.
2. Run `git add -A` to stage everything.
3. Craft a concise commit message that summarizes what changed. If the user provided a message via $ARGUMENTS, use that as the subject line; otherwise derive it from the diff.
4. Commit using this exact format (HEREDOC so special characters are safe):
   ```
   git commit -m "$(cat <<'EOF'
   <subject line here>

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
5. Run `git push` — the remote URL already contains the GitHub PAT so no credentials are needed.
6. Tell the user: commit hash, commit message, and that Vercel will auto-deploy from the push (usually takes ~1 min). No need to do anything else.

Context:
- Repo: https://github.com/charbeld/foot-guru (PAT already in remote URL)
- Vercel project: foot-guru.vercel.app — connected to this repo, deploys automatically on push to main
- Working directory: C:\Users\Charbel\Desktop\Claude\Foot Guru\foot-guru

If the working tree is already clean, tell the user there is nothing to commit and skip to done.

$ARGUMENTS

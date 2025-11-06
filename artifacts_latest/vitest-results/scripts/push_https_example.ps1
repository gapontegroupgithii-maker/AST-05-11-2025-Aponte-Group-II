<#
  push_https_example.ps1
  Example PowerShell script to push to a GitHub repository using HTTPS + PAT stored
  in environment variable GITHUB_PAT. This script does NOT print or store the token.

  Usage:
    $env:GITHUB_PAT = Read-Host -AsSecureString | ConvertFrom-SecureString
    # Better: set GITHUB_PAT in your environment securely via Windows settings
    .\scripts\push_https_example.ps1

  This is an example for non-programmers to run a secure push without SSH.
#>

param(
  [string]$Remote = 'gaponte',
  [string]$Repo = 'gapontegroupgithii-maker/AST-04-11-2025'
)

if (-not $env:GITHUB_PAT) {
  Write-Host "Environment variable GITHUB_PAT is not set."
  Write-Host "Create a Personal Access Token (repo scope) and set it in GITHUB_PAT before running this script."
  exit 1
}

$url = "https://$($env:GITHUB_PAT)@github.com/$Repo.git"

Write-Host "Adding temporary remote 'https-temp' pointing to $Repo (HTTPS with token)"
git remote remove https-temp 2>$null
git remote add https-temp $url

Write-Host "Pushing current branch to remote 'https-temp'..."
git push https-temp HEAD:main-local-copy

Write-Host "Removing temporary remote 'https-temp'..."
git remote remove https-temp

Write-Host "Done. Verify the push in the repository on GitHub."

param([string]$Destination)
$ErrorActionPreference = 'Stop'
$mailboxRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $Destination) {
  $Destination = Join-Path (Split-Path $mailboxRoot -Parent) 'our-mailbox-source.zip'
}
$mailboxArchivePath = [IO.Path]::GetFullPath($Destination)
$mailboxDirectories = @('app','components','hooks','lib','public','scripts','tests','supabase','.openai')
$mailboxFiles = @('README.md','VALIDATION.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','.npmrc','.gitignore','.env.example','.oxfmtrc.json','.oxlintrc.json','components.json','next.config.ts','next-env.d.ts','postcss.config.mjs','tsconfig.json','vite.config.ts','wrangler.jsonc')
$mailboxSources = @()
foreach ($mailboxDirectory in $mailboxDirectories) {
  $mailboxSources += Get-ChildItem -LiteralPath (Join-Path $mailboxRoot $mailboxDirectory) -File -Recurse -Force
}
foreach ($mailboxFile in $mailboxFiles) {
  $mailboxFilePath = Join-Path $mailboxRoot $mailboxFile
  if (Test-Path -LiteralPath $mailboxFilePath) { $mailboxSources += Get-Item -LiteralPath $mailboxFilePath -Force }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$mailboxStream = [IO.File]::Open($mailboxArchivePath,[IO.FileMode]::Create,[IO.FileAccess]::Write)
$mailboxArchive = New-Object IO.Compression.ZipArchive($mailboxStream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($mailboxSource in $mailboxSources) {
    $mailboxAbsolute = [IO.Path]::GetFullPath($mailboxSource.FullName)
    if (-not $mailboxAbsolute.StartsWith($mailboxRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Source path escaped the project.' }
    $mailboxEntry = $mailboxAbsolute.Substring($mailboxRoot.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($mailboxArchive,$mailboxAbsolute,'our-mailbox/' + $mailboxEntry,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $mailboxArchive.Dispose()
  $mailboxStream.Dispose()
}
Write-Output ('Created source-only archive with ' + $mailboxSources.Count + ' files: ' + $mailboxArchivePath)

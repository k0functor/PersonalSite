# Run this from the project root BEFORE or AFTER copying the patch.
# It removes only the old MDX/catch-all IUM files, not the new PDF routes.

$paths = @(
  "src/pages/ru/math/ium/[...slug].astro",
  "src/pages/en/math/ium/[...slug].astro",
  "src/layouts/IumSheetLayout.astro",
  "src/components/IumSheetCard.astro",
  "src/content/math-ium"
)

foreach ($path in $paths) {
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
    Write-Host "Removed $path"
  }
}

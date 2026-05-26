$ErrorActionPreference = 'Continue'
$token = "sbp_2d688f6c60d1c71a05130e3adf3b1688f947d344"
$projectRef = "wrfraskmawmciiutwcpx"

$sql = Get-Content "supabase\migrations\058_wilayah.sql" -Raw

# Build JSON payload with query as escaped string
$escapedSql = $sql -replace '\\', '\\\\' -replace '"', '\"'
$body = "{`"query`":`"$escapedSql`"}"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Applying migration 058_wilayah.sql..." -ForegroundColor Cyan

try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $resp = Invoke-WebRequest -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Method Post -Headers $headers -Body $bytes
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host $resp.Content
} catch {
    Write-Host "HTTP ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

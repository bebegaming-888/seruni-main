# Apply wilayah migration via Supabase Management API
$token = $env:SUPABASE_PERSONAL_ACCESS_TOKEN
$projectRef = "wrfraskmawmciiutwcpx"

# Read migration SQL
$sql = Get-Content "supabase\migrations\058_wilayah.sql" -Raw

# Escape for JSON
$sqlEscaped = $sql -replace '\\', '\\' -replace '"', '\"' -replace "`r`n", "\n" -replace "`n", "\n"

# Build JSON body
$body = @{
    query = $sqlEscaped
} | ConvertTo-Json -Compress

# Execute via Management API
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Applying migration 058_wilayah.sql..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/sql" -Method Post -Headers $headers -Body $body
    Write-Host "✅ Migration applied successfully" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "❌ Migration failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
}

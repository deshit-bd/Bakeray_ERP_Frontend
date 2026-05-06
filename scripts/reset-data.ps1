$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.local"
$apiBaseUrl = $env:NEXT_PUBLIC_API_BASE_URL

if (-not $apiBaseUrl -and (Test-Path -LiteralPath $envFile)) {
  $envLine = Get-Content -LiteralPath $envFile |
    Where-Object { $_ -match "^\s*NEXT_PUBLIC_API_BASE_URL\s*=" } |
    Select-Object -First 1

  if ($envLine) {
    $apiBaseUrl = ($envLine -split "=", 2)[1].Trim()
  }
}

if (-not $apiBaseUrl) {
  $apiBaseUrl = "http://localhost:5000/api"
}

$apiBaseUrl = $apiBaseUrl.TrimEnd("/")

$arrayKeys = @(
  "erp-suppliers",
  "erp-customers",
  "erp-customer-orders",
  "erp-simple-purchases",
  "erp-supplier-payment-history",
  "erp-supplier-payment-accounts",
  "erp_factory_issue_history_v1",
  "erp_mix_production_batches_v1",
  "erp_mix_production_history_v1",
  "erp_bulk_mix_stock_rows_v1",
  "erp_packaging_history_rows_v1",
  "erp_finished_stock_rows_v1",
  "erp-repack-product-history",
  "erp-outside-products",
  "erp-sales-rows",
  "erp-invoice-rows",
  "erp-expense-history",
  "erp-expense-categories",
  "erp-miscellaneous-items",
  "erp-accounts-journal-entries",
  "erp-raw-materials",
  "erp-raw-material-stock",
  "erp-raw-material-production",
  "erp-repackaging-production-rows",
  "erp-inventory-items",
  "erp-repacking-orders",
  "erp-packaging-stock"
)

$data = [ordered]@{
  "erp-theme" = "default"
  "erp-data-reset-token-v1" = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
  "erp-auth-session-v1" = $null
  "erp-materials-minimum-stock-v1" = @{}
  "erp-system-settings-v1" = @{}
}

foreach ($key in $arrayKeys) {
  $data[$key] = @()
}

$payload = @{ data = $data } | ConvertTo-Json -Depth 20

Invoke-RestMethod `
  -Method Put `
  -Uri "$apiBaseUrl/local-data/bulk" `
  -ContentType "application/json" `
  -Body $payload |
  Out-Null

function Set-DataKey([string]$key, [AllowNull()][object]$value) {
  $encodedKey = [Uri]::EscapeDataString($key)
  $body = @{ value = $value } | ConvertTo-Json -Depth 20

  Invoke-RestMethod `
    -Method Put `
    -Uri "$apiBaseUrl/local-data/$encodedKey" `
    -ContentType "application/json" `
    -Body $body |
    Out-Null
}

foreach ($key in $data.Keys) {
  Set-DataKey $key ([object]$data[$key])
}

function Clear-OptionalEndpoint([string]$path) {
  $endpoint = "$apiBaseUrl/$path"

  try {
    Invoke-RestMethod -Method Delete -Uri $endpoint | Out-Null
    Write-Host "Cleared $path"
    return
  } catch {
    # Some backend builds do not expose bulk DELETE. Fall back to row deletes.
  }

  try {
    $response = Invoke-RestMethod -Method Get -Uri "${endpoint}?limit=10000"
    $rows = @()

    if ($response -is [array]) {
      $rows = @($response)
    } elseif ($response.PSObject.Properties.Name -contains "data") {
      $rows = @($response.data)
    }

    $rows = @($rows | Where-Object { $_ -and $_.id })

    foreach ($row in $rows) {
      $id = $row.id
      $encodedId = [Uri]::EscapeDataString([string]$id)
      Invoke-RestMethod -Method Delete -Uri "$endpoint/$encodedId" | Out-Null
    }

    if ($rows.Count -gt 0) {
      Write-Host "Cleared $($rows.Count) row(s) from $path"
    }
  } catch {}
}

Clear-OptionalEndpoint "factory-issues"
Clear-OptionalEndpoint "purchases"
Clear-OptionalEndpoint "suppliers"
Clear-OptionalEndpoint "customers"
Clear-OptionalEndpoint "customer-orders"
Clear-OptionalEndpoint "supplier-payments"
Clear-OptionalEndpoint "mix-productions"
Clear-OptionalEndpoint "bulk-mix-stocks"
Clear-OptionalEndpoint "packaging"
Clear-OptionalEndpoint "packaging-stocks"
Clear-OptionalEndpoint "finished-stocks"
Clear-OptionalEndpoint "outside-products"
Clear-OptionalEndpoint "sales"
Clear-OptionalEndpoint "invoices"
Clear-OptionalEndpoint "expenses"
Clear-OptionalEndpoint "miscellaneous"
Clear-OptionalEndpoint "raw-materials"
Clear-OptionalEndpoint "raw-material-stocks"
Clear-OptionalEndpoint "raw-material-productions"
Clear-OptionalEndpoint "repack-products"
Clear-OptionalEndpoint "repacking-orders"

Write-Host "ERP data reset complete. Auth/user tables were not touched."

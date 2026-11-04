[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Artist
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot '.env'
$baseUrl = 'https://hackathon.api.qloo.com'

function Get-LocalApiKey {
    param([string]$Path)

    if (Test-Path -LiteralPath $Path) {
        foreach ($line in Get-Content -LiteralPath $Path) {
            $trimmed = $line.Trim()
            if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }

            if ($trimmed -match '^(?:export\s+)?QLOO_API_KEY\s*=\s*(.*)$') {
                $value = $Matches[1].Trim()
                if ($value.Length -ge 2) {
                    $first = $value.Substring(0, 1)
                    $last = $value.Substring($value.Length - 1, 1)
                    if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
                        $value = $value.Substring(1, $value.Length - 2)
                    }
                }
                if ($value) { return $value }
            }
        }
    }

    if ($env:QLOO_API_KEY) { return $env:QLOO_API_KEY }
    return $null
}

function Remove-CredentialText {
    param([string]$Text, [string]$ApiKey)

    if (-not $Text) { return '' }
    $clean = $Text -replace [regex]::Escape($ApiKey), '[REDACTED]'
    $clean = $clean -replace '(?i)(x-api-key\s*[:=]\s*)\S+', '$1[REDACTED]'
    $clean = $clean -replace '(?i)(bearer\s+)\S+', '$1[REDACTED]'
    $clean = ($clean -replace '\s+', ' ').Trim()
    if ($clean.Length -gt 300) { $clean = $clean.Substring(0, 300) + '...' }
    return $clean
}

$apiKey = Get-LocalApiKey -Path $envFile
if (-not $apiKey) {
    Write-Output 'ERROR: No QLOO_API_KEY found. Copy .env.example to .env and set your hackathon key.'
    exit 1
}

$query = [uri]::EscapeDataString($Artist)
$type = [uri]::EscapeDataString('urn:entity:artist')
$uri = "$baseUrl/search?query=$query&types=$type&take=5"
$headers = @{ 'X-Api-Key' = $apiKey; 'Accept' = 'application/json' }

try {
    $response = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing -TimeoutSec 30
    $statusText = "HTTP $([int]$response.StatusCode) $($response.StatusDescription)"
    $data = $response.Content | ConvertFrom-Json

    Write-Output $statusText

    $results = @($data.results)
    if ($results.Count -eq 0) {
        Write-Output 'No matching artists.'
        exit 0
    }

    $results | Select-Object -First 5 | ForEach-Object {
        $id = $_.entity_id
        if (-not $id) { $id = $_.id }
        $name = $_.name
        if (-not $name -and $_.properties) { $name = $_.properties.name }
        Write-Output ("{0} | {1}" -f $name, $id)
    }
}
catch {
    $webResponse = $_.Exception.Response
    $statusText = 'ERROR'
    $detail = $_.Exception.Message

    if ($webResponse) {
        try {
            $statusText = "HTTP $([int]$webResponse.StatusCode) $($webResponse.StatusDescription)"
        } catch {}

        try {
            $stream = $webResponse.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $body = $reader.ReadToEnd()
                $reader.Dispose()

                try {
                    $errorPayload = $body | ConvertFrom-Json
                    $parts = @()
                    if ($errorPayload.reason) { $parts += [string]$errorPayload.reason }
                    if ($errorPayload.message) { $parts += [string]$errorPayload.message }
                    if ($parts.Count -gt 0) { $detail = $parts -join ': ' }
                } catch {}
            }
        } catch {}
    }

    $detail = Remove-CredentialText -Text $detail -ApiKey $apiKey
    Write-Output ("{0} - {1}" -f $statusText, $detail)
    exit 1
}

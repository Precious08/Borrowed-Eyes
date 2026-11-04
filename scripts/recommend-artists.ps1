[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Name,

    [Parameter(Mandatory = $true, Position = 1)]
    [string[]]$Id,

    [ValidateRange(1, 50)]
    [int]$Take = 10
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot '.env'
$responsesDir = Join-Path $repoRoot 'responses'
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

function Test-HasValue {
    param($Value)

    if ($null -eq $Value) { return $false }
    if ($Value -is [string]) { return -not [string]::IsNullOrWhiteSpace($Value) }
    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        foreach ($item in $Value) { return $true }
        return $false
    }
    return $true
}

$apiKey = Get-LocalApiKey -Path $envFile
if (-not $apiKey) {
    Write-Output 'ERROR: No QLOO_API_KEY found. Copy .env.example to .env and set your hackathon key.'
    exit 1
}

if (-not (Test-Path -LiteralPath $responsesDir)) {
    New-Item -ItemType Directory -Path $responsesDir -Force | Out-Null
}

$encodedType = [uri]::EscapeDataString('urn:entity:artist')
$encodedSignal = [uri]::EscapeDataString(($Id -join ','))
$uri = "$baseUrl/v2/insights?filter.type=$encodedType&signal.interests.entities=$encodedSignal&take=$Take"
$headers = @{ 'X-Api-Key' = $apiKey; 'Accept' = 'application/json' }

try {
    $response = Invoke-WebRequest -Uri $uri -Method Get -Headers $headers -UseBasicParsing -TimeoutSec 30
    $statusText = "HTTP $([int]$response.StatusCode) $($response.StatusDescription)"
    $data = $response.Content | ConvertFrom-Json

    $safeName = ($Name -replace '[^A-Za-z0-9._-]', '-').Trim('-').ToLower()
    if (-not $safeName) { $safeName = 'artist' }
    $outFile = Join-Path $responsesDir ("recommendations-{0}-{1}.json" -f $safeName, (Get-Date -Format 'yyyyMMdd-HHmmss'))
    Set-Content -LiteralPath $outFile -Value $response.Content -Encoding UTF8

    Write-Output $statusText

    $entities = @($data.results.entities)
    Write-Output ("Results: {0}" -f $entities.Count)

    $entities | Select-Object -First $Take | ForEach-Object {
        $entityId = $_.entity_id
        if (-not $entityId) { $entityId = $_.id }
        $entityName = $_.name
        if (-not $entityName -and $_.properties) { $entityName = $_.properties.name }

        $scores = [ordered]@{}
        foreach ($property in @($_.PSObject.Properties)) {
            if ($property.Name -match '^(affinity|popularity|score|match)(_rank)?$' -and $null -ne $property.Value) {
                $scores[$property.Name] = $property.Value
            }
        }
        if ($_.properties) {
            foreach ($property in @($_.properties.PSObject.Properties)) {
                if ($property.Name -match '^(affinity|popularity|score|match)(_rank)?$' -and $null -ne $property.Value) {
                    $scores["properties.$($property.Name)"] = $property.Value
                }
            }
        }
        if ($_.query) {
            if ($null -ne $_.query.affinity) {
                $scores['affinity'] = $_.query.affinity
            }
            if ($_.query.measurements) {
                foreach ($property in @($_.query.measurements.PSObject.Properties)) {
                    if ($null -ne $property.Value) {
                        $scores["measurements.$($property.Name)"] = $property.Value
                    }
                }
            }
        }
        $scoreText = if ($scores.Count -gt 0) { ($scores.GetEnumerator() | ForEach-Object { "{0}={1}" -f $_.Key, $_.Value }) -join ', ' } else { 'none' }

        $hasImage = $false
        $hasDescription = $false
        $hasExternal = $false

        if ($_.properties) {
            $hasImage = (Test-HasValue $_.properties.image)
            $hasDescription = (Test-HasValue $_.properties.description)
            $hasExternal = (Test-HasValue $_.properties.external) -or (Test-HasValue $_.properties.websites)
        }
        $hasImage = $hasImage -or (Test-HasValue $_.image)
        $hasDescription = $hasDescription -or (Test-HasValue $_.description)
        $hasExternal = $hasExternal -or (Test-HasValue $_.external) -or (Test-HasValue $_.websites)

        Write-Output ("{0} | {1} | {2} | image={3} description={4} external={5}" -f `
            $entityName, $entityId, $scoreText,
            $(if ($hasImage) { 'yes' } else { 'no' }),
            $(if ($hasDescription) { 'yes' } else { 'no' }),
            $(if ($hasExternal) { 'yes' } else { 'no' }))
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

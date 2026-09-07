$TOKEN_A = "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"
$TOKEN_B = "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"

# Read the current token from the active PowerShell session
$CURRENT = $env:ANTHROPIC_AUTH_TOKEN

if ($CURRENT -eq $TOKEN_A) {
    # Update active PowerShell session
    $env:ANTHROPIC_AUTH_TOKEN = $TOKEN_B
    # Update Windows Registry for future sessions
    [System.Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $TOKEN_B, 'User')
    Write-Host "Swapped active environment variable to Token B." -ForegroundColor Green
} else {
    # Update active PowerShell session
    $env:ANTHROPIC_AUTH_TOKEN = $TOKEN_A
    # Update Windows Registry for future sessions
    [System.Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $TOKEN_A, 'User')
    Write-Host "Swapped active environment variable to Token A." -ForegroundColor Green
}

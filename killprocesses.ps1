# Port to kill
$port = 3000

Write-Host "Scanning for processes using port $port ..."

# Find all lines with this port
$lines = netstat -ano | findstr ":$port"

if (!$lines) {
    Write-Host "No processes found on port $port."
    exit
}

# Extract PIDs safely
$procIds = @()

foreach ($line in $lines) {
    $parts = $line -split "\s+"
    $id = $parts[-1]

    if ($id -match '^\d+$') {
        $procIds += $id
    }
}

$procIds = $procIds | Select-Object -Unique

Write-Host "Found PIDs: $($procIds -join ', ')"
Write-Host "Killing all..."

foreach ($procId in $procIds) {
    Write-Host "Killing PID $procId"
    taskkill /PID $procId /F | Out-Null
}

Write-Host "All processes on port $port have been terminated."

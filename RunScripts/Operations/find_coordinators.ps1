# ==============================================================================
# OptimusDB Coordinator Finder - Detailed Analysis (PowerShell)
# ==============================================================================

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        OptimusDB Cluster - Coordinator Detection              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$coordinators = 0
$followers = 0
$candidates = 0
$offline = 0

$coordinatorNodes = @()
$followerNodes = @()
$candidateNodes = @()
$offlineNodes = @()

# Query each node
for ($i = 1; $i -le 8; $i++) {
    $port = 18000 + $i
    $nodeId = "optimusdb$i"

    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "Node ${i}: $nodeId (Port: $port)" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$port/swarmkb/status" -TimeoutSec 3 -ErrorAction Stop

        $role = $response.role
        $peerId = $response.peer_id
        $term = $response.term
        $health = $response.health_score
        $connected = $response.connected_peers

        # Determine role and display
        switch ($role) {
            { $_ -in @("Coordinator", "coordinator", "COORDINATOR") } {
                Write-Host "🔶 ROLE: $role" -ForegroundColor Yellow
                Write-Host "✓ Status: COORDINATOR FOUND!" -ForegroundColor Green
                $coordinators++
                $peerShort = $peerId.Substring(0, [Math]::Min(12, $peerId.Length))
                $coordinatorNodes += "$nodeId ($peerShort...)"
            }
            { $_ -in @("Follower", "follower", "FOLLOWER") } {
                Write-Host "🟢 ROLE: $role" -ForegroundColor Green
                $followers++
                $followerNodes += $nodeId
            }
            { $_ -in @("Candidate", "candidate", "CANDIDATE") } {
                Write-Host "🟡 ROLE: $role" -ForegroundColor Yellow
                $candidates++
                $candidateNodes += $nodeId
            }
            default {
                Write-Host "❓ ROLE: $role" -ForegroundColor Yellow
            }
        }

        $peerShort = $peerId.Substring(0, [Math]::Min(20, $peerId.Length))
        Write-Host "   Peer ID: $peerShort..." -ForegroundColor Gray
        Write-Host "   Term: $term" -ForegroundColor Gray
        Write-Host "   Health Score: $health" -ForegroundColor Gray
        Write-Host "   Connected Peers: $connected" -ForegroundColor Gray
    }
    catch {
        Write-Host "❌ Status: OFFLINE or UNREACHABLE" -ForegroundColor Red
        $offline++
        $offlineNodes += $nodeId
    }

    Write-Host ""
}

# Summary
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      CLUSTER SUMMARY                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔶 Coordinators Found: $coordinators" -ForegroundColor Yellow
if ($coordinatorNodes.Count -gt 0) {
    foreach ($node in $coordinatorNodes) {
        Write-Host "   ├─ $node" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "🟢 Followers: $followers" -ForegroundColor Green
if ($followerNodes.Count -gt 0) {
    foreach ($node in $followerNodes) {
        Write-Host "   ├─ $node" -ForegroundColor Green
    }
}
Write-Host ""

if ($candidates -gt 0) {
    Write-Host "🟡 Candidates: $candidates" -ForegroundColor Yellow
    foreach ($node in $candidateNodes) {
        Write-Host "   ├─ $node" -ForegroundColor Yellow
    }
    Write-Host ""
}

if ($offline -gt 0) {
    Write-Host "❌ Offline: $offline" -ForegroundColor Red
    foreach ($node in $offlineNodes) {
        Write-Host "   ├─ $node" -ForegroundColor Red
    }
    Write-Host ""
}

# Analysis
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                         ANALYSIS                               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($coordinators -eq 0) {
    Write-Host "⚠️  WARNING: No coordinator found!" -ForegroundColor Red
    Write-Host "   → Cluster has no leader" -ForegroundColor Red
    Write-Host "   → Elections may not be working" -ForegroundColor Red
    Write-Host "   → Action: Trigger a new election" -ForegroundColor Red
    Write-Host ""
}
elseif ($coordinators -eq 1) {
    Write-Host "✓ HEALTHY: Exactly one coordinator found" -ForegroundColor Green
    Write-Host "   → Cluster is in a valid state" -ForegroundColor Green
    Write-Host ""
}
elseif ($coordinators -gt 1) {
    Write-Host "🚨 CRITICAL: SPLIT-BRAIN DETECTED!" -ForegroundColor Red
    Write-Host "   → Multiple coordinators found: $coordinators" -ForegroundColor Red
    Write-Host "   → This indicates a network partition or election failure" -ForegroundColor Red
    Write-Host "   → Data consistency may be compromised" -ForegroundColor Red
    Write-Host ""
    Write-Host "Recommended Actions:" -ForegroundColor Yellow
    Write-Host "   1. Check network connectivity between nodes" -ForegroundColor Yellow
    Write-Host "   2. Review election logs for errors" -ForegroundColor Yellow
    Write-Host "   3. Restart all coordinator nodes" -ForegroundColor Yellow
    Write-Host "   4. Trigger a new election" -ForegroundColor Yellow
    Write-Host ""
}

if ($candidates -gt 0) {
    Write-Host "⚠️  Election in Progress" -ForegroundColor Yellow
    Write-Host "   → $candidates node(s) currently in candidate state" -ForegroundColor Yellow
    Write-Host "   → Wait for election to complete" -ForegroundColor Yellow
    Write-Host ""
}

$online = 8 - $offline
$quorum = 5

Write-Host "Connectivity Status:" -ForegroundColor Cyan
Write-Host "   Online Nodes: $online/8"
Write-Host "   Quorum Required: $quorum"

if ($online -ge $quorum) {
    Write-Host "   ✓ Quorum available" -ForegroundColor Green
}
else {
    Write-Host "   ✗ Quorum NOT available (need $quorum, have $online)" -ForegroundColor Red
}

Write-Host ""
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Exit code based on coordinator count
if ($coordinators -eq 1) {
    exit 0  # Success
}
elseif ($coordinators -eq 0) {
    exit 1  # No coordinator
}
else {
    exit 2  # Split-brain
}
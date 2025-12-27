Write-Host "🔄 Rebuilding only the catalogmetadata container..." -ForegroundColor Cyan

# 1️⃣ Stop and remove the existing catalogmetadata container
docker compose -f ../dockerDDC.yml stop catalogmetadata
docker compose -f ../dockerDDC.yml rm -f catalogmetadata

# 2️⃣ Rebuild the image (no cache to ensure Python changes are picked up)
docker compose -f ../dockerDDC.yml build --no-cache catalogmetadata

# 3️⃣ Restart only the catalogmetadata container
docker compose -f ../dockerDDC.yml up -d catalogmetadata

# 4️⃣ Show logs for quick health verification
Write-Host "📜 Showing last 20 lines of catalogmetadata logs..." -ForegroundColor Yellow
docker compose -f ../dockerDDC.yml logs -f --tail=20 catalogmetadata

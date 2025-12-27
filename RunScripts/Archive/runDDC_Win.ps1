# Run.ps1 - Start Decentralized Data Catalog with OptimusDB (Windows)

Write-Host "🚀 Starting Decentralized Data Catalog..."

# Step 1: Create external Docker network (if not exists)
if (-Not (docker network ls | Select-String "swarmnet")) {
    docker network create --driver bridge swarmnet
}

# Step 2: Start OptimusDB container (if not already running)
#if (-Not (docker ps | Select-String "optimusdb1")) {
#    docker run -d --network=swarmnet --name=optimusdb1 `
#      -p 18001:8089 -p 14001:4001 -p 15001:5001 optimusdb:latest
#}

# Step 3: Launch Amundsen + OptimusDB services
docker-compose -f dockerDDC.yml up --build
#!/bin/bash
# run.sh - Start Decentralized Data Catalog with OptimusDB (Linux/macOS)

echo "🚀 Starting Decentralized Data Catalog..."

# Step 1: Create external Docker network (if not exists)
docker network ls | grep -q "swarmnet"
if [ $? -ne 0 ]; then
    docker network create --driver bridge swarmnet
fi

# Step 2: Start OptimusDB container (if not already running)
#docker ps | grep -q "optimusdb1"
#if [ $? -ne 0 ]; then
#    docker run -d --network=swarmnet --name=optimusdb1 \
#      -p 18001:8089 -p 14001:4001 -p 15001:5001 optimusdb:latest
#fi

# Step 3: Launch Amundsen + OptimusDB services
docker-compose -f dockerDDC.yml up --build
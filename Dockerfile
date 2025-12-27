services:
  #neo4j:
  #  image: neo4j:3.5.26
  #  container_name: neo4j_ddc
  #  environment:
  #    - NEO4J_AUTH=neo4j/test
  #  ulimits:
  #    nofile:
  #      soft: 40000
  #      hard: 40000
  #  ports:
  #    - 7474:7474
  #    - 7687:7687
  #  volumes:
  #    - ./example/docker/neo4j/conf:/var/lib/neo4j/conf
  #    - ./example/docker/neo4j/plugins:/var/lib/neo4j/plugins
  #    - ./example/backup:/backup
  #    - neo4j_data:/data
  #  networks:
  #    - catalognet

  #elasticsearch:
  #  image: elasticsearch:8.0.0
  #  container_name: elastic_ddc
  #  ports:
  #    - 9200:9200
  #  volumes:
  #    - es_data:/usr/share/elasticsearch/data
  #  networks:
  #    - catalognet
  #  ulimits:
  #    nofile:
  #      soft: 65536
  #      hard: 65536
  #  environment:
  #    - discovery.type=single-node
  #    - xpack.security.enabled=false

  # ============================================================================
  # CATALOG SEARCH - FIXED FOR OPTIMUSDB
  # ============================================================================
  catalogsearch:
    build:
      context: ./search
      dockerfile: Dockerfile.search.public
    container_name: catalogsearch
    ports:
      - 5013:5013
    depends_on:
      - optimusdb1  # ✅ CHANGED: Now depends on OptimusDB instead of elasticsearch
    networks:
      - catalognet
    environment:
      # ✅ CHANGED: Use OptimusDB instead of Elasticsearch
      - OPTIMUSDB=search_service.proxy.optimusdb_search.OptimusDBSearchProxy
      - OPTIMUSDB_API_URL=http://optimusdb1:8089
      - SEARCH_SVC_CONFIG_MODULE_CLASS=search_service.config.LocalConfig
    # ✅ REMOVED: command (Dockerfile already has it)

  # ============================================================================
  # CATALOG METADATA - NO CHANGES NEEDED
  # ============================================================================
  catalogmetadata:
    build:
      context: ./metadata
      dockerfile: Dockerfile.metadata.local
    container_name: catalogmetadata
    ports:
      - 5014:5014
    depends_on:
      - optimusdb1  # ✅ Added explicit dependency
    networks:
      - catalognet
    environment:
      - ES_PROXY_CLIENT=OPTIMUSDB
      - OPTIMUSDB_API_URL=http://optimusdb1:8089
      - PROXY_CLIENT=metadata_service.proxy.optimusdb_proxy.OptimusDBProxy
      - METADATA_SVC_CONFIG_MODULE_CLASS=metadata_service.config.LocalConfig
    # ✅ REMOVED: command (Dockerfile already has it)

  # ============================================================================
  # CATALOG FRONTEND - NO CHANGES NEEDED
  # ============================================================================
  catalogfrontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend.local
    container_name: catalogfrontend
    depends_on:
      - catalogmetadata
      - catalogsearch
    ports:
      - 5015:5015
    networks:
      - catalognet
    environment:
      - SEARCHSERVICE_BASE=http://catalogsearch:5013
      - METADATASERVICE_BASE=http://catalogmetadata:5014
      - FRONTEND_SVC_CONFIG_MODULE_CLASS=amundsen_application.config.TestConfig
    # ✅ REMOVED: command (Dockerfile already has it)

  # ============================================================================
  # OPTIMUSDB NODES (1-8) - NO CHANGES NEEDED
  # ============================================================================
  optimusdb1:
    image: ghcr.io/georgegeorgakakos/optimusdb:latest
    container_name: optimusdb1
    hostname: optimusdb1
    environment:
      NODE_NAME: optimusdb1
    ports:
      - 18001:8089  # API
      - 14001:4001  # P2P
      - 15001:5001  # Gateway
    networks:
      - catalognet

  optimusdb2:
    image: ghcr.io/georgegeorgakakos/optimusdb:latest
    container_name: optimusdb2
    hostname: optimusdb2
    environment:
      NODE_NAME: optimusdb2
    ports:
      - 18002:8089
      - 14002:4001
      - 15002:5001
    networks:
      - catalognet

  optimusdb3:
    image: ghcr.io/georgegeorgakakos/optimusdb:latest
    container_name: optimusdb3
    hostname: optimusdb3
    environment:
      NODE_NAME: optimusdb3
    ports:
      - 18003:8089
      - 14003:4001
      - 15003:5001
    networks:
      - catalognet

  optimusdb4:
    image: ghcr.io/georgegeorgakakos/optimusdb:latest
    container_name: optimusdb4
    hostname: optimusdb4
    environment:
      NODE_NAME: optimusdb4
    ports:
      - 18004:8089
      - 14004:4001
      - 15004:5001
    networks:
      - catalognet

  optimusdb5:
    image: ghcr.io/georgegeorgakakos/optimusdb:latest
    container_name: optimusdb5
    hostname: optimusdb5
    environment:
      NODE_NAME: optimusdb5
    ports:
      - 18005:8089
      - 14005:4001
      - 15005:5001
    networks:
      - catalognet

  optimusdb6:
    image: ghcr.io/georgegeorgakakos/optimusdb:latest
    container_name: optimusdb6
    hostname: optimusdb6
    environment:
      NODE_NAME: optimusdb6
    ports:
      - 18006:8089
      - 14006:4001
      - 15006:5001
    networks:
      - catalognet

  optimusdb7:
    image: ghcr.io/georgegeorgakakos/optimusdb:latest
    container_name: optimusdb7
    hostname: optimusdb7
    environment:
      NODE_NAME: optimusdb7
    ports:
      - 18007:8089
      - 14007:4001
      - 15007:5001
    networks:
      - catalognet

  optimusdb8:
    image: ghcr.io/georgegeorgakakos/optimusdb:latest
    container_name: optimusdb8
    hostname: optimusdb8
    environment:
      NODE_NAME: optimusdb8
    ports:
      - 18008:8089
      - 14008:4001
      - 15008:5001
    networks:
      - catalognet

networks:
  catalognet:

volumes:
  es_data:

# OptimusDB-ddC Configuration (Energy Edition)
# Generated: 2025-11-29 19:12:06

import os
from metadata_service.proxy.optimusdb_proxy import OptimusDBProxy

OPTIMUSDB_API_URL = os.environ.get('OPTIMUSDB_API_URL', 'http://host.docker.internal:18001')
OPTIMUSDB_TIMEOUT_CONNECT = 5.0
OPTIMUSDB_TIMEOUT_READ = 30.0
OPTIMUSDB_REGISTER_SYSTEM_TABLE = True
SEARCHSERVICE_BASE = os.environ.get('SEARCHSERVICE_BASE', 'http://elasticsearch:9200')
PROXY_CLIENT = OptimusDBProxy
HOST = '0.0.0.0'
PORT = 5002
DEBUG = False
LOG_LEVEL = 'INFO'

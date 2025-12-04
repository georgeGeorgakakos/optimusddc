# Copyright Contributors to the Amundsen project.
# SPDX-License-Identifier: Apache-2.0

import distutils.util
import logging
import os
from typing import Any, Callable, Dict, List, Optional, Set  # noqa: F401

import boto3
from flask import Flask  # noqa: F401

from metadata_service.entity.badge import Badge

# PROXY configuration keys
PROXY_HOST = 'PROXY_HOST'
PROXY_PORT = 'PROXY_PORT'
PROXY_USER = 'PROXY_USER'
PROXY_PASSWORD = 'PROXY_PASSWORD'
PROXY_ENCRYPTED = 'PROXY_ENCRYPTED'
PROXY_VALIDATE_SSL = 'PROXY_VALIDATE_SSL'
PROXY_DATABASE_NAME = 'PROXY_DATABASE_NAME'
PROXY_CLIENT = 'PROXY_CLIENT'
PROXY_CLIENT_KWARGS = 'PROXY_CLIENT_KWARGS'

# Proxy Configuration
#PROXY_CLIENT = 'metadata_service.proxy.optimusdb_proxy.OptimusDBProxy'
#OPTIMUSDB_API_URL = os.environ.get('OPTIMUSDB_API_URL', 'http://optimusdb1:8089')

# Proxy Client Implementations
PROXY_CLIENTS = {
    'NEO4J': 'metadata_service.proxy.neo4j_proxy.Neo4jProxy',
    'ATLAS': 'metadata_service.proxy.atlas_proxy.AtlasProxy',
    'NEPTUNE': 'metadata_service.proxy.neptune_proxy.NeptuneGremlinProxy',
    'MYSQL': 'metadata_service.proxy.mysql_proxy.MySQLProxy',
    'OPTIMUSDB': 'metadata_service.proxy.optimusdb_proxy.OptimusDBProxy'  # Custom integration
}

PROXY_CLIS = {
    'MYSQL': 'metadata_service.cli.rds_command.rds_cli'
}

IS_STATSD_ON = 'IS_STATSD_ON'
USER_OTHER_KEYS = 'USER_OTHER_KEYS'
# OptimusDB Search Configuration
OPTIMUSDB_NODES = [
    #'optimusdb1', 'optimusdb2', 'optimusdb3'
    'optimusdb1'
]
OPTIMUSDB_DISCOVERY_TIMEOUT = 5  # seconds
OPTIMUSDB_ENABLE_SEARCH_CACHE = False  # Enable for production
OPTIMUSDB_SEARCH_CACHE_TTL = 300  # 5 minutes
OPTIMUSDB_API_URL = os.environ.get('OPTIMUSDB_API_URL', 'http://optimusdb1:8089')

# Background Indexer Configuration
INDEXER_ENABLED = os.environ.get('INDEXER_ENABLED', 'True').lower() == 'true'
INDEXER_INTERVAL = int(os.environ.get('INDEXER_INTERVAL', 600))  # 10 minutes

# Elasticsearch Configuration
ELASTICSEARCH_URL = os.environ.get('ELASTICSEARCH_URL', 'http://localhost:9200')
# Search Results Configuration
SEARCH_PAGE_SIZE = 10
SEARCH_MAX_RESULTS = 100

class Config:
    LOG_FORMAT = '%(asctime)s.%(msecs)03d [%(levelname)s] %(module)s.%(funcName)s:%(lineno)d (%(process)d:'                  '%(threadName)s) - %(message)s'
    LOG_DATE_FORMAT = '%Y-%m-%dT%H:%M:%S%z'
    LOG_LEVEL = 'INFO'
    LOG_CONFIG_FILE = None

    PROXY_USER = os.environ.get('CREDENTIALS_PROXY_USER', 'neo4j')
    PROXY_PASSWORD = os.environ.get('CREDENTIALS_PROXY_PASSWORD', 'test')

    PROXY_ENCRYPTED = True
    PROXY_VALIDATE_SSL = False
    PROXY_DATABASE_NAME = None
    IS_STATSD_ON = False

    STATISTICS_FORMAT_SPEC: Dict[str, Dict] = {}
    WHITELIST_BADGES: List[Badge] = []

    SWAGGER_ENABLED = os.environ.get('SWAGGER_ENABLED', False)

    USER_DETAIL_METHOD = None
    RESOURCE_REPORT_CLIENT = None
    USER_OTHER_KEYS = {'mode_user_id'}

    POPULAR_TABLE_MINIMUM_READER_COUNT = None
    POPULAR_RESOURCES_MINIMUM_READER_COUNT = 10

    PROGRAMMATIC_DESCRIPTIONS_EXCLUDE_FILTERS = []

    PROXY_CLIENT_KWARGS: Dict = dict()
    INIT_CUSTOM_EXT_AND_ROUTES = None  # type: Callable[[Flask], None]

    SWAGGER_TEMPLATE_PATH = os.path.join('api', 'swagger_doc', 'template.yml')
    SWAGGER = {
        'openapi': '3.0.2',
        'title': 'Metadata Service',
        'uiversion': 3
    }


class LocalConfig(Config):
    DEBUG = True
    TESTING = False
    LOG_LEVEL = 'DEBUG'
    LOCAL_HOST = '0.0.0.0'

    PROXY_HOST = os.environ.get('PROXY_HOST', f'bolt://{LOCAL_HOST}')
    PROXY_PORT = os.environ.get('PROXY_PORT', 7687)

    # ✅ Use OptimusDB as default proxy
    #PROXY_CLIENT = PROXY_CLIENTS[os.environ.get('PROXY_CLIENT', 'OPTIMUSDB')]
    env_proxy_client = os.environ.get('PROXY_CLIENT', 'OPTIMUSDB')
    PROXY_CLIENT = PROXY_CLIENTS.get(env_proxy_client, env_proxy_client)


    # ✅ Custom REST endpoint for OptimusDB
    OPTIMUSDB_API_URL = os.environ.get('OPTIMUSDB_API_URL', 'http://localhost:8089')
    PROXY_CLIENT_KWARGS = {
        'optimusdb_api_url': OPTIMUSDB_API_URL
    }

    PROXY_ENCRYPTED = bool(distutils.util.strtobool(os.environ.get(PROXY_ENCRYPTED, 'True')))
    PROXY_VALIDATE_SSL = bool(distutils.util.strtobool(os.environ.get(PROXY_VALIDATE_SSL, 'False')))
    IS_STATSD_ON = bool(distutils.util.strtobool(os.environ.get(IS_STATSD_ON, 'False')))
    SWAGGER_ENABLED = True


class AtlasConfig(LocalConfig):
    PROXY_HOST = os.environ.get('PROXY_HOST', 'localhost')
    PROXY_PORT = os.environ.get('PROXY_PORT', '21000')
    PROXY_CLIENT = PROXY_CLIENTS['ATLAS']
    WATERMARK_DATE_FORMATS = ['%Y%m%d']


class MySQLConfig(LocalConfig):
    PROXY_CLIENT = PROXY_CLIENTS['MYSQL']
    PROXY_CLI = PROXY_CLIS['MYSQL']
    PROXY_HOST = None
    PROXY_PORT = None
    PROXY_USER = None
    PROXY_PASSWORD = None

    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'mysql://user:password@127.0.0.1:3306/amundsen')
    PROXY_CLIENT_KWARGS: Dict[str, Any] = {
        'echo': bool(distutils.util.strtobool(os.environ.get('ECHO', 'False'))),
        'pool_size': os.environ.get('POOL_SIZE', 5),
        'max_overflow': os.environ.get('MAX_OVERFLOW', 10),
        'connect_args': dict()
    }


try:
    from amundsen_gremlin.config import LocalGremlinConfig

    class GremlinConfig(LocalGremlinConfig, LocalConfig):
        JANUS_GRAPH_URL = None

    class NeptuneConfig(LocalGremlinConfig, LocalConfig):
        DEBUG = False
        LOG_LEVEL = 'INFO'
        PROXY_HOST = os.environ.get('PROXY_HOST', 'localhost')
        PROXY_PORT = None
        PROXY_CLIENT = PROXY_CLIENTS['NEPTUNE']
        PROXY_PASSWORD = boto3.session.Session(region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        PROXY_CLIENT_KWARGS = {
            'neptune_bulk_loader_s3_bucket_name': os.environ.get('S3_BUCKET_NAME'),
            'ignore_neptune_shard': distutils.util.strtobool(os.environ.get('IGNORE_NEPTUNE_SHARD', 'True')),
            'sts_endpoint': os.environ.get('STS_ENDPOINT')
        }
        JANUS_GRAPH_URL = None
except ImportError:
    logging.warning("""amundsen_gremlin not installed. GremlinConfig and NeptuneConfig classes won't be available!
    Please install amundsen-metadata[gremlin] if you desire to use those classes.
    """)
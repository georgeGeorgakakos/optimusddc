# Copyright Contributors to the Amundsen project.
# SPDX-License-Identifier: Apache-2.0

import os
from typing import Any, Optional
from search_service.proxy.optimusdb_search import OptimusDBSearchProxy

STATS_FEATURE_KEY = 'STATS'

# Proxy client configuration
PROXY_ENDPOINT = 'PROXY_ENDPOINT'
PROXY_USER = 'PROXY_USER'
PROXY_PASSWORD = 'PROXY_PASSWORD'
ELASTICSEARCH_CLIENT = 'ELASTICSEARCH_CLIENT'

# Proxy client class mappings
PROXY_CLIENTS = {
    'ELASTICSEARCH': 'search_service.proxy.elasticsearch.ElasticsearchProxy',
    'ELASTICSEARCH_V2': 'search_service.proxy.es_proxy_v2.ElasticsearchProxyV2',
    'ELASTICSEARCH_V2_1': 'search_service.proxy.es_proxy_v2_1.ElasticsearchProxyV2_1',
    'OPTIMUSDB': 'search_service.proxy.optimusdb_search.OptimusDBSearchProxy'
}
PROXY_CLIENT = OptimusDBSearchProxy

class Config:
    # Specify the alias string template under which the ES index exists for each resource
    ES_INDEX_ALIAS_TEMPLATE = '{resource}_search_index_v2_1'

    # Use OptimusDB by default
    ES_PROXY_CLIENT = PROXY_CLIENTS[os.environ.get('ES_PROXY_CLIENT', 'OPTIMUSDB')]

    # OptimusDB Configuration
    OPTIMUSDB_API_URL = os.environ.get('OPTIMUSDB_API_URL', 'http://localhost:8089')

    LOG_FORMAT = '%(asctime)s.%(msecs)03d [%(levelname)s] %(module)s.%(funcName)s:%(lineno)d (%(process)d:' \
                 '%(threadName)s) - %(message)s'
    LOG_DATE_FORMAT = '%Y-%m-%dT%H:%M:%S%z'
    LOG_LEVEL = 'INFO'

    LOG_CONFIG_FILE = None
    SWAGGER_ENABLED = os.environ.get('SWAGGER_ENABLED', False)


class LocalConfig(Config):
    DEBUG = False
    TESTING = False
    STATS = False
    LOCAL_HOST = '0.0.0.0'
    PROXY_PORT = '8089'

    # OptimusDB endpoint instead of Elasticsearch
    PROXY_ENDPOINT = os.environ.get('PROXY_ENDPOINT',
                                    os.environ.get('OPTIMUSDB_API_URL', 'http://localhost:8089'))

    # Use OptimusDB by default
    ES_PROXY_CLIENT = PROXY_CLIENTS[os.environ.get('ES_PROXY_CLIENT', 'OPTIMUSDB')]

    # No Elasticsearch client needed for OptimusDB
    ELASTICSEARCH_CLIENT: Optional[Any] = None

    PROXY_USER = os.environ.get('CREDENTIALS_PROXY_USER', 'elastic')
    PROXY_PASSWORD = os.environ.get('CREDENTIALS_PROXY_PASSWORD', 'elastic')

    SWAGGER_ENABLED = True
    SWAGGER_TEMPLATE_PATH = os.path.join('api', 'swagger_doc', 'template.yml')
    SWAGGER = {
        'openapi': '3.0.2',
        'title': 'Search Service',
        'uiversion': 3
    }


class AwsSearchConfig(LocalConfig):
    """
    AWS deployment configuration for OptimusDB.
    
    Set OPTIMUSDB_API_URL environment variable to your OptimusDB endpoint.
    For AWS deployments, configure the endpoint to point to your OptimusDB cluster.
    """
    # OptimusDB endpoint (e.g., internal load balancer in AWS)
    OPTIMUSDB_API_URL = os.environ.get('OPTIMUSDB_API_URL', 'http://optimusdb-service:8089')

    PROXY_ENDPOINT = os.environ.get('PROXY_ENDPOINT', OPTIMUSDB_API_URL)

    # No Elasticsearch client needed
    ELASTICSEARCH_CLIENT = None
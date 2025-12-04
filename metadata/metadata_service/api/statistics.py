# Copyright Contributors to the Amundsen project.
# SPDX-License-Identifier: Apache-2.0

"""
Statistics API for Catalog-wide Metadata
Place in: metadata_service/api/statistics.py
"""

import logging
from http import HTTPStatus
from typing import Iterable, Mapping, Union

from flask import request
from flask_restful import Resource, reqparse

from metadata_service.exception import NotFoundException
from metadata_service.proxy import get_proxy_client

LOGGER = logging.getLogger(__name__)


class CatalogStatisticsAPI(Resource):
    """
    Catalog Statistics API
    Returns catalog-wide statistics like total dataset count, schema count, etc.
    """

    def __init__(self) -> None:
        self.proxy = get_proxy_client()
        super(CatalogStatisticsAPI, self).__init__()

    def get(self) -> Iterable[Union[Mapping, int, None]]:
        """
        GET /catalog/stats

        Returns catalog-wide statistics:
        {
            "total_datasets": 150,
            "total_schemas": 12,
            "last_updated": 1234567890
        }
        """
        try:
            stats = self.proxy.get_catalog_statistics()
            return stats, HTTPStatus.OK

        except NotFoundException as e:
            LOGGER.exception(f'Catalog statistics not found: {e}')
            return {'message': 'Catalog statistics not available'}, HTTPStatus.NOT_FOUND

        except Exception as e:
            LOGGER.exception(f'Error getting catalog statistics: {e}')
            return {'message': 'Internal server error'}, HTTPStatus.INTERNAL_SERVER_ERROR


class PopularTablesAPI(Resource):
    """
    Popular Tables API
    Returns the most popular/frequently accessed tables
    """

    def __init__(self) -> None:
        self.proxy = get_proxy_client()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('num_entries', type=int, default=10, required=False)
        super(PopularTablesAPI, self).__init__()

    def get(self) -> Iterable[Union[Mapping, int, None]]:
        """
        GET /popular_tables/?num_entries=10

        Returns list of popular tables
        """
        try:
            args = self.parser.parse_args()
            num_entries = args.get('num_entries', 10)

            tables = self.proxy.get_popular_tables(num_entries=num_entries)

            return {
                'results': tables,
                'total': len(tables),
                'msg': 'Success'
            }, HTTPStatus.OK

        except Exception as e:
            LOGGER.exception(f'Error getting popular tables: {e}')
            return {'message': 'Internal server error'}, HTTPStatus.INTERNAL_SERVER_ERROR
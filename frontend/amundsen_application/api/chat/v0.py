# Copyright Contributors to the Amundsen project.
# SPDX-License-Identifier: Apache-2.0
#
# OptimusDB Chat Proxy — forwards /api/v1/chat to OptimusDB backend nodes.
#
# In production behind Traefik, the IngressRoute handles this directly.
# This proxy exists so that:
#   1. Local dev (Flask on :5015) works without Traefik
#   2. Any deployment without an ingress controller still works
#   3. CORS is handled server-side
#
# Configuration via environment variables:
#   OPTIMUSDB_CHAT_ENDPOINTS — comma-separated list of OptimusDB base URLs
#       default: http://localhost:8089
#       example: http://optimusdb1:8089,http://optimusdb2:8089,http://optimusdb3:8089

import logging
import os
import random
import time
from typing import List, Optional, Tuple

import requests
from flask import Blueprint, Response, jsonify, request

LOGGER = logging.getLogger(__name__)

chat_blueprint = Blueprint('chat', __name__, url_prefix='/api/v1/chat')

# ── Backend node pool ────────────────────────────────────────────────────────

_DEFAULT_ENDPOINTS = 'http://localhost:8089'


def _get_endpoints() -> List[str]:
    raw = os.getenv('OPTIMUSDB_CHAT_ENDPOINTS', _DEFAULT_ENDPOINTS)
    endpoints = [e.strip().rstrip('/') for e in raw.split(',') if e.strip()]
    return endpoints or [_DEFAULT_ENDPOINTS]


def _try_request(
    method: str,
    path: str,
    endpoints: List[str],
    timeout: int = 120,
    **kwargs,
) -> Tuple[Optional[requests.Response], Optional[str]]:
    """Try each endpoint in shuffled order; return first success."""
    shuffled = list(endpoints)
    random.shuffle(shuffled)
    last_error = None

    for base in shuffled:
        url = f'{base}{path}'
        try:
            resp = requests.request(method, url, timeout=timeout, **kwargs)
            return resp, None
        except requests.exceptions.RequestException as exc:
            last_error = f'{url}: {exc}'
            LOGGER.warning('OptimusDB chat proxy: %s', last_error)

    return None, last_error


# ── POST /api/v1/chat ────────────────────────────────────────────────────────

@chat_blueprint.route('', methods=['POST'])
def chat_query() -> Response:
    """Proxy a natural-language query to OptimusDB's /api/v1/chat endpoint."""
    endpoints = _get_endpoints()
    payload = request.get_json(silent=True) or {}

    resp, error = _try_request(
        'POST',
        '/api/v1/chat',
        endpoints,
        timeout=120,  # TinyLlama translation can take 60-80s
        json=payload,
        headers={'Content-Type': 'application/json'},
    )

    if resp is not None:
        # Forward the response as-is
        try:
            data = resp.json()
        except ValueError:
            data = {'response': resp.text, 'metadata': {}}
        return jsonify(data), resp.status_code

    LOGGER.error('OptimusDB chat proxy: all endpoints failed — %s', error)
    return jsonify({
        'response': 'Unable to reach OptimusDB backend. Please check that the cluster is running.',
        'metadata': {
            'query_type': 'error',
            'error': error or 'All endpoints unreachable',
        },
    }), 502


# ── GET /api/v1/chat/health ──────────────────────────────────────────────────

@chat_blueprint.route('/health', methods=['GET'])
def chat_health() -> Response:
    """Proxy the health check to OptimusDB."""
    endpoints = _get_endpoints()

    resp, error = _try_request('GET', '/api/v1/chat/health', endpoints, timeout=10)

    if resp is not None:
        try:
            data = resp.json()
        except ValueError:
            data = {'status': 'unknown', 'raw': resp.text}
        return jsonify(data), resp.status_code

    return jsonify({
        'status': 'unreachable',
        'error': error or 'All endpoints unreachable',
    }), 502

# Copyright Contributors to the Amundsen project.
# SPDX-License-Identifier: Apache-2.0

"""
OptimusDDC Custom Authentication with Keycloak Backend
Provides branded login page with Keycloak authentication

This file is designed to be placed in: amundsen_application/custom_auth_config.py
The imports will resolve when deployed in the Amundsen Docker container.
"""

import os
import logging
from typing import Optional, Dict, Any, Callable
from functools import wraps
from urllib.parse import quote

# Third-party imports
import requests
from flask import Flask, redirect, request, session, render_template, url_for

# Amundsen imports - these will be available in the container
# IDE may show warnings, but they will resolve in production
try:
    from amundsen_application.config import LocalConfig
    from amundsen_application.models.user import User, load_user
except ImportError:
    # For local development/testing - create stub classes
    class LocalConfig:
        """Stub for local development"""
        pass

    class User:
        """Stub for local development"""
        pass

    def load_user(user_data: Dict[str, Any]) -> Optional[User]:
        """Stub for local development"""
        return None


# Configure logging
logger = logging.getLogger(__name__)

# Keycloak configuration from environment variables
KEYCLOAK_URL = os.getenv('KEYCLOAK_URL', 'http://keycloak:8080')
KEYCLOAK_REALM = os.getenv('KEYCLOAK_REALM', 'optimusddc')
KEYCLOAK_CLIENT_ID = os.getenv('KEYCLOAK_CLIENT_ID', 'amundsen-frontend')
KEYCLOAK_CLIENT_SECRET = os.getenv('KEYCLOAK_CLIENT_SECRET', 'optimusddc-secret-2025')


def authenticate_with_keycloak(username: str, password: str) -> Dict[str, Any]:
    """
    Authenticate against Keycloak using Direct Grant (Resource Owner Password Credentials) flow.

    Args:
        username: The username to authenticate
        password: The password to authenticate

    Returns:
        Dictionary containing user information from Keycloak

    Raises:
        ValueError: If authentication fails or connection cannot be established

    Example:
        >>> user_info = authenticate_with_keycloak('demo', 'demo123')
        >>> print(user_info['user_id'])
        'demo'
    """
    token_url = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token"

    data = {
        'grant_type': 'password',
        'client_id': KEYCLOAK_CLIENT_ID,
        'client_secret': KEYCLOAK_CLIENT_SECRET,
        'username': username,
        'password': password,
        'scope': 'openid profile email'
    }

    try:
        # Request access token
        logger.debug(f"Authenticating user '{username}' with Keycloak at {token_url}")
        response = requests.post(token_url, data=data, timeout=10)
        response.raise_for_status()
        token_data = response.json()

        # Get user info from Keycloak userinfo endpoint
        userinfo_url = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/userinfo"
        headers = {'Authorization': f"Bearer {token_data['access_token']}"}
        userinfo_response = requests.get(userinfo_url, headers=headers, timeout=10)
        userinfo_response.raise_for_status()
        user_info = userinfo_response.json()

        logger.info(f"Successfully authenticated user '{username}'")

        # Return normalized user information
        return {
            'user_id': user_info.get('preferred_username', username),
            'email': user_info.get('email', f"{username}@optimusddc.com"),
            'first_name': user_info.get('given_name', ''),
            'last_name': user_info.get('family_name', ''),
            'full_name': user_info.get('name', username),
            'display_name': user_info.get('name', username),
            'is_active': True,
            'access_token': token_data['access_token'],
            'refresh_token': token_data.get('refresh_token'),
        }

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            logger.warning(f"Authentication failed for user '{username}': Invalid credentials")
            raise ValueError("Invalid username or password")
        logger.error(f"Authentication failed for user '{username}': HTTP {e.response.status_code}")
        raise ValueError(f"Authentication failed: {str(e)}")

    except requests.exceptions.Timeout:
        logger.error(f"Authentication timeout for user '{username}'")
        raise ValueError("Authentication server is not responding. Please try again.")

    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to Keycloak at {KEYCLOAK_URL}")
        raise ValueError("Could not connect to authentication server. Please contact support.")

    except requests.exceptions.RequestException as e:
        logger.error(f"Authentication error for user '{username}': {str(e)}")
        raise ValueError(f"Could not connect to authentication server: {str(e)}")


def get_custom_auth_user(app: Flask) -> Optional[User]:
    """
    Get the current authenticated user from the session.

    This function is called by Amundsen's user management system to retrieve
    the currently authenticated user information.

    Args:
        app: The Flask application instance

    Returns:
        User object if authenticated, None otherwise
    """
    user_data = session.get('user')
    if user_data:
        logger.debug(f"Loading user from session: {user_data.get('user_id')}")
        return load_user(user_data)
    return None


def init_custom_auth(app: Flask) -> None:
    """
    Initialize custom authentication routes and handlers.

    This function is called during Flask app initialization to set up:
    - Login route (GET/POST /login)
    - Logout route (GET /logout)
    - Before-request authentication check

    Args:
        app: The Flask application instance
    """
    logger.info("Initializing custom authentication for OptimusDDC")

    @app.route('/login', methods=['GET', 'POST'])
    def custom_login():
        """
        Handle custom branded login page and authentication.

        GET: Display the login form
        POST: Process login credentials and authenticate with Keycloak
        """
        # If already logged in, redirect to home
        if 'user' in session:
            logger.debug(f"User '{session['user']['user_id']}' already authenticated, redirecting to home")
            return redirect('/')

        error = None

        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')
            remember = request.form.get('remember') == '1'

            if not username or not password:
                error = 'Please enter both username and password.'
            else:
                try:
                    # Authenticate against Keycloak
                    logger.info(f"Processing login attempt for user '{username}'")
                    user_info = authenticate_with_keycloak(username, password)

                    # Store user in session
                    session['user'] = {
                        'user_id': user_info['user_id'],
                        'email': user_info['email'],
                        'first_name': user_info['first_name'],
                        'last_name': user_info['last_name'],
                        'full_name': user_info['full_name'],
                        'display_name': user_info['display_name'],
                        'is_active': user_info['is_active']
                    }

                    # Set session permanent if remember me is checked
                    if remember:
                        session.permanent = True
                        app.permanent_session_lifetime = 604800  # 7 days
                        logger.debug(f"Remember me enabled for user '{username}'")

                    logger.info(f"User '{username}' successfully authenticated")

                    # Redirect to original destination or home
                    next_page = request.args.get('next')
                    if next_page and next_page.startswith('/'):
                        return redirect(next_page)
                    return redirect('/')

                except ValueError as e:
                    error = str(e)
                    logger.warning(f"Login failed for user '{username}': {error}")

                except Exception as e:
                    error = 'An error occurred during login. Please try again.'
                    logger.error(f"Unexpected error during login for user '{username}': {str(e)}", exc_info=True)

            # If there's an error, redirect with error parameter for JavaScript to display
            if error:
                logger.debug(f"Redirecting to login with error: {error}")
                return redirect(f'/login?error={quote(error)}')

        # Render login template (no variables needed - pure HTML)
        return render_template('login.html')

    @app.route('/logout')
    def custom_logout():
        """
        Handle logout - clear session and redirect to login page.
        """
        user_id = session.get('user', {}).get('user_id', 'unknown')
        session.clear()
        logger.info(f"User '{user_id}' logged out")
        return redirect(url_for('custom_login'))

    # Authentication check before each request
    @app.before_request
    def check_authentication():
        """
        Check if user is authenticated before processing requests.

        Public endpoints (login, logout, health checks, static files) are allowed.
        All other endpoints require authentication.
        """
        # Public endpoints that don't require authentication
        public_endpoints = [
            'custom_login',
            'custom_logout',
            'healthcheck',
            'health',
            'status',
            'static'
        ]

        # Skip authentication for public endpoints and static files
        if request.endpoint in public_endpoints or \
                (request.endpoint and request.endpoint.startswith('static')):
            return None

        # Require authentication for all other endpoints
        if 'user' not in session:
            logger.debug(f"Unauthenticated access to {request.endpoint}, redirecting to login")
            return redirect(url_for('custom_login', next=request.url))

    logger.info("Custom authentication initialized successfully")


class CustomAuthConfig(LocalConfig):
    """
    Custom Authentication Configuration for OptimusDDC.

    This configuration class extends Amundsen's LocalConfig to provide
    custom authentication using a branded login page with Keycloak backend.

    Features:
    - Custom login page with OptimusDDC branding
    - Keycloak authentication backend
    - Session-based user management
    - Remember me functionality
    - Configurable session timeouts

    Environment Variables:
        KEYCLOAK_URL: Keycloak server URL (default: http://keycloak:8080)
        KEYCLOAK_REALM: Keycloak realm name (default: optimusddc)
        KEYCLOAK_CLIENT_ID: Client ID (default: amundsen-frontend)
        KEYCLOAK_CLIENT_SECRET: Client secret (default: optimusddc-secret-2025)
        FLASK_SECRET_KEY: Flask session secret key
        SESSION_COOKIE_SECURE: Enable secure cookies for HTTPS (default: False)
    """

    # Authentication method - called by Amundsen to get current user
    AUTH_USER_METHOD = get_custom_auth_user

    # Session configuration
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'OptimusDDC-Change-This-Secret-Key')
    SESSION_TYPE = 'filesystem'
    SESSION_FILE_DIR = '/tmp/flask_session'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour default (overridden if remember me is checked)
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    # Initialize custom routes - called by Flask during app initialization
    INIT_CUSTOM_ROUTES = init_custom_auth
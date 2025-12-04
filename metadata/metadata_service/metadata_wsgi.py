# metadata_service/metadata_wsgi.py

# Copyright Contributors to the Amundsen project.
# SPDX-License-Identifier: Apache-2.0

import os
from metadata_service import create_app

# Entry point for Gunicorn
application = create_app(
    config_module_class=os.getenv('METADATA_SVC_CONFIG_MODULE_CLASS') or
    'metadata_service.config.LocalConfig'
)

# DO NOT call application.run() unless for standalone dev mode
if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5002, debug=True)

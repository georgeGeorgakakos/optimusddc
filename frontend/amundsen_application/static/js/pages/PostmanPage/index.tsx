// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import DocumentTitle from 'react-document-title';

import PostmanInterface from 'components/PostmanInterface';

import './styles.scss';

export const POSTMAN_PAGE_TITLE = 'API Console';

/**
 * API Testing Console Page
 *
 * This page provides a Postman-like interface for testing OptimusDB,
 * CatalogSearch, and CatalogMetadata APIs directly from the web interface.
 * Supports importing Postman collections and executing HTTP requests.
 */
const PostmanPage: React.FC = () => {
  return (
    <DocumentTitle title={`${POSTMAN_PAGE_TITLE} - OptimusDDC`}>
      <main className="container-fluid postman-page">
        <div className="row">
          <div className="col-xs-12">
            <PostmanInterface />
          </div>
        </div>
      </main>
    </DocumentTitle>
  );
};

export default PostmanPage;

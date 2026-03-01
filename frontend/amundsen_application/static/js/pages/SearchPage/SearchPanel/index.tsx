// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import ClusterTopology from './ClusterTopology';
import InventoryStats from './InventoryStats';

import './styles.scss';

type SearchPanelProps = {
  children: React.ReactNode;
};

const SearchPanel: React.FC = ({ children }: SearchPanelProps) => (
  <aside className="search-control-panel">
    {React.Children.map(children, (child, index) => (
      <div key={`search-panel-child:${index}`} className="section">
        {child}
      </div>
    ))}
    <div className="section section--topology">
      <ClusterTopology />
    </div>
    <div className="section section--inventory">
      <InventoryStats />
    </div>
  </aside>
);

export default SearchPanel;

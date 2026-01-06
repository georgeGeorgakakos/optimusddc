# OptimusDDC Frontend

> A sophisticated data catalog frontend for distributed OptimusDB cluster management, built on the Amundsen framework with extensive customizations for renewable energy metadata management.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-16.14.0-61dafb)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776ab)](https://www.python.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Guide](#development-guide)
- [API Integration](#api-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**OptimusDDC** is a production-ready data catalog interface designed for managing distributed databases in renewable energy contexts. Built for the **CENTERIS 2025** conference presentation, it extends the Amundsen framework with:

- 🌐 **Distributed Cluster Management**: Real-time monitoring of 8-node OptimusDB clusters
- 📊 **Advanced Analytics**: Log analysis, metrics visualization, and performance tracking
- 🔧 **API Testing Console**: Postman-like interface for OptimusDB API interaction
- 📈 **Query Workbench**: SQL editor with distributed query execution
- 💾 **Data Inventory**: SQLite and OrbitDB storage visualization

### Use Case
PhD research project at **Athens University of Economics and Business** focusing on distributed systems for renewable energy metadata management, combining LibP2P networking, OrbitDB storage, and TinyLlama AI integration.

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OptimusDDC Frontend Architecture                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE LAYER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Navigation    │  │    HomePage     │  │   Search Bar    │              │
│  │      Bar        │  │    Widgets      │  │   Component     │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PAGE ROUTING LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                         React Router (routes.tsx)                           │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Core Pages                  │  OptimusDB Pages                      │   │
│  ├──────────────────────────────┼───────────────────────────────────────┤   │
│  │  • HomePage                  │  • ClusterTopologyPage                │   │
│  │  • SearchPage                │  • QueryWorkbenchPage                 │   │
│  │  • BrowsePage                │  • LogAnalyticsPage                   │   │
│  │  • TableDetailPage           │  • PostmanPage (API Testing)          │   │
│  │  • DashboardPage             │  • PersistedDataPage                  │   │
│  │  • FeaturePage               │  • MetricsPage                        │   │
│  │  • LineagePage               │  • WikiPage                           │   │
│  │  • ProfilePage               │                                       │   │
│  └──────────────────────────────┴───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Reusable Components                              │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  PostmanInterface/          DataCatalogAssistant/                     │  │
│  │  ├── RequestTree             ├── AI Query Assistant                   │  │
│  │  ├── RequestPanel            └── Search Suggestions                   │  │
│  │  ├── ResponsePanel                                                    │  │
│  │  ├── VariablesModal          Card/                                    │  │
│  │  └── ToscaUploadModal        ├── Generic card wrapper                 │  │
│  │                               └── Styling utilities                   │  │
│  │  Alert/                                                               │  │
│  │  ├── Alert component          Table/                                  │  │
│  │  └── AlertList                ├── Generic table                       │  │
│  │                               └── Sorting & filtering                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Homepage Widgets                                 │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  • SearchBarWidget          • ClusterHealthWidget (Real-time)         │  │
│  │  • PopularResourcesWidget   • AgentMetricsWidget                      │  │
│  │  • MyBookmarksWidget        • PersistedDataWidget                     │  │
│  │  • TagsWidget               • SwarmchestrateWidget                    │  │
│  │  • BadgesWidget                                                       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATE MANAGEMENT LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Redux Store (ducks/)                              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │     search      │  │  tableMetadata  │  │    bookmark     │              │
│  │   ├── reducer   │  │   ├── reducer   │  │   ├── reducer   │              │
│  │   ├── actions   │  │   ├── actions   │  │   ├── actions   │              │
│  │   ├── sagas     │  │   ├── sagas     │  │   └── types     │              │
│  │   └── types     │  │   └── types     │  └─────────────────┘              │
│  └─────────────────┘  └─────────────────┘                                   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │      user       │  │     notices     │  │      tags       │              │
│  │   ├── reducer   │  │   ├── reducer   │  │   ├── reducer   │              │
│  │   ├── actions   │  │   ├── actions   │  │   ├── actions   │              │
│  │   └── types     │  │   └── types     │  │   └── types     │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CONFIGURATION LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  config-default.ts              apiConfig.ts                                │
│  ├── Navigation links           ├── getAvailableNodes()                     │
│  ├── Homepage widgets           ├── buildApiUrl()                           │
│  ├── Logo & branding            └── Dynamic node discovery                  │
│  ├── Feature flags                                                          │
│  └── Theme settings             config-utils.ts                             │
│                                 ├── Helper functions                        │
│                                 └── Configuration utilities                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API INTEGRATION LAYER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐    │
│  │  OptimusDB API      │  │  CatalogSearch API   │  │ CatalogMetadata  │    │
│  ├─────────────────────┤  ├──────────────────────┤  │      API         │    │
│  │ • /swarmkb/agent/   │  │ • /api/search/v1/    │  │ • /api/metadata/ │    │
│  │   status            │  │   table              │  │   v0/table       │    │
│  │ • /swarmkb/logs/    │  │ • /api/search/v1/    │  │ • /api/metadata/ │    │
│  │   {date}/{hour}     │  │   dashboard          │  │   v0/user        │    │
│  │ • /swarmkb/query    │  │ • /api/search/v1/    │  │ • /api/metadata/ │    │
│  │ • /swarmkb/         │  │   user               │  │   v0/popular     │    │
│  │   inventory         │  └──────────────────────┘  └──────────────────┘    │
│  └─────────────────────┘                                                    │
│                                                                             │
│  Dynamic URL Construction:                                                  │
│  • Docker: http://optimusdb-{nodeId}:1800{nodeId}/swarmkb/...               │
│  • K3s: http://catalogfrontend:8080/api/optimusdb/{nodeId}/swarmkb/...      │
│  • Dev: http://localhost:1800{nodeId}/swarmkb/...                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVICES LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │
│  │  OptimusDB    │  │ CatalogSearch │  │CatalogMetadata│                  │
│  │   Node 1-8    │  │   Service     │  │   Service     │                  │
│  │               │  │               │  │               │                  │
│  │ • LibP2P      │  │ • Elasticsearch│ │ • Neo4j       │                  │
│  │ • OrbitDB     │  │ • Search Index │  │ • Metadata DB │                  │
│  │ • SQLite      │  │ • Ranking     │  │ • Table info  │                  │
│  │ • TinyLlama   │  └───────────────┘  │ • Users       │                  │
│  │ • IPFS        │                     │ • Lineage     │                  │
│  └───────────────┘                     └───────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  Example: Cluster Health Widget                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User opens HomePage                                             │
│          ↓                                                        │
│  React renders ClusterHealthWidget                               │
│          ↓                                                        │
│  useEffect() hook triggers on mount                              │
│          ↓                                                        │
│  getAvailableNodes() called                                      │
│          ↓                                                        │
│  Returns [Node1, Node2, ..., Node8]                              │
│          ↓                                                        │
│  For each node:                                                  │
│    buildApiUrl('optimusdb', '/swarmkb/agent/status', nodeId)    │
│          ↓                                                        │
│    fetch(apiUrl, { timeout: 5000 })                              │
│          ↓                                                        │
│  Collect responses in parallel (Promise.all)                     │
│          ↓                                                        │
│  Parse NodeHealth from each response                             │
│          ↓                                                        │
│  Calculate cluster statistics:                                   │
│    • activeNodes = nodes.filter(n => n.online)                   │
│    • healthyNodes = nodes.filter(n => n.healthScore <= 60)       │
│    • warningNodes = nodes.filter(n => 60 < score <= 80)          │
│    • criticalNodes = nodes.filter(n => n.healthScore > 80)       │
│    • consensusActive = coordinators.count === 1                  │
│          ↓                                                        │
│  Update React state: setHealth(clusterHealth)                    │
│          ↓                                                        │
│  Component re-renders with new data                              │
│          ↓                                                        │
│  Display: 2x2 grid with metrics                                  │
│  • Active Nodes: 7/8                                             │
│  • Network Status: Optimal ✓                                     │
│  • Consensus: Active ✓                                           │
│  • Avg Health: 45.2%                                             │
│          ↓                                                        │
│  Setup auto-refresh timer (180 seconds)                          │
│          ↓                                                        │
│  Repeat cycle every 3 minutes                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW DIAGRAM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User Interaction                                                            │
│         ↓                                                                    │
│  React Component (UI Event)                                                  │
│         ↓                                                                    │
│  Redux Action Dispatch                                                       │
│         ↓                                                                    │
│  Redux Saga (Side Effect)                                                    │
│         ↓                                                                    │
│  API Call (via axios/fetch)                                                  │
│         ↓                                                                    │
│  Backend Service Response                                                    │
│         ↓                                                                    │
│  Redux Reducer (State Update)                                                │
│         ↓                                                                    │
│  React Component Re-render                                                   │
│         ↓                                                                    │
│  Updated UI                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🎛️ Core Pages

#### 1. **Cluster Topology** (`/cluster/topology`)
Real-time network visualization and health monitoring.
- Live cluster health metrics
- Node status indicators (online/offline)
- Leader election visualization
- Performance metrics (CPU, memory, disk, latency)
- Auto-refresh with configurable intervals

#### 2. **Log Analytics** (`/logs`)
Comprehensive log analysis across all cluster nodes.
- 14 log types: DEBUG, INFO, QUERY, LINEAGE, MESH, REPLICATION, ELECTION, CACHE, AI, METRICS, PROC, DISCOVERY, WARN, ERROR
- Advanced filtering by type, node, time range, and search term
- Real-time statistics and health indicators
- Time-series visualizations
- Pagination (25/50/100 logs per page)
- Auto-refresh (60-second interval)

#### 3. **API Testing Console** (`/api-testing`)
Postman-like interface for API interaction.
- Import Postman collections
- Variable interpolation ({{variable}} syntax)
- TOSCA template support
- Request/Response visualization
- HTTP methods: GET, POST, PUT, DELETE, PATCH
- Multi-format request bodies (JSON, XML, form-data)

#### 4. **Query Workbench** (`/queryworkbench`)
SQL query interface with distributed execution.
- Monaco-based SQL editor with syntax highlighting
- Schema explorer (databases, tables, columns)
- Query execution and result visualization
- Query history tracking
- Performance trace analysis
- Multi-tab result viewing

#### 5. **Persisted Data Inventory** (`/persisted-data`)
Visualization of SQLite and OrbitDB storage across the cluster.
- SQLite table inventory with row counts
- OrbitDB store visualization (docstore, eventlog)
- Replication heatmap (5x8 grid)
- Agent health status
- Sync status monitoring

#### 6. **Metrics Dashboard** (`/metrics`)
System-wide metrics and performance monitoring.
- Real-time performance metrics
- Historical trend analysis
- Resource utilization tracking
- Custom metric visualization

### 🏠 Homepage Widgets

**ClusterHealthWidget**: 2x2 grid showing active nodes, network status, consensus status, and average health score with auto-refresh every 3 minutes.

**AgentMetricsWidget**: Real-time agent performance metrics and response time tracking.

**PersistedDataWidget**: Cluster data inventory summary with quick stats.

**SearchBarWidget**: Primary search interface with auto-complete suggestions.

**PopularResourcesWidget**: Most accessed tables and trending searches.

**MyBookmarksWidget**: User's bookmarked resources for quick access.

**TagsWidget**: Popular tags and tag-based navigation.

**BadgesWidget**: System badges and data quality indicators.

**SwarmchestrateWidget**: Swarm orchestration status overview.

---

## 🛠️ Technology Stack

### Frontend
- **React** 16.14.0 - UI framework
- **TypeScript** 4.x - Type-safe JavaScript
- **Redux** 4.x - State management
- **Redux-Saga** - Side effect management
- **React Router** 5.x - Navigation
- **SCSS/Sass** - Styling

### UI Libraries & Tools
- **Bootstrap** - Grid system
- **Ionicons** - Icon library
- **Monaco Editor** - Code editor (SQL)
- **Chart.js** - Charts and visualizations
- **D3.js** - Network visualizations

### Backend
- **Flask** - Python web framework
- **Python** 3.8+ - Backend services

### Build Tools
- **Webpack** 5.x - Module bundler
- **Babel** 7.x - JavaScript compiler
- **ESLint** - Code linting
- **Jest** - Testing framework
- **React Testing Library** - Component testing

### Deployment
- **Docker** - Containerization
- **Kubernetes (K3s)** - Orchestration
- **Nginx** - Reverse proxy (optional)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 12.x (recommended: v12.22.0)
- **npm** >= 6.x
- **Python** >= 3.8
- **Docker** (for containerized deployment)
- **Kubernetes/K3s** (optional, for cluster deployment)

### Installation

#### 1. Clone the repository
```bash
git clone <repository-url>
cd frontend
```

#### 2. Install dependencies

**Frontend (JavaScript/TypeScript):**
```bash
cd amundsen_application/static
npm install
```

**Backend (Python):**
```bash
cd ../..
pip install -r requirements.txt
```

#### 3. Configuration

Copy and modify the configuration file:
```bash
cp amundsen_application/static/js/config/config-default.ts \
   amundsen_application/static/js/config/config-custom.ts
```

Edit `config-custom.ts` to set:
- API endpoints
- Navigation links
- Homepage widgets
- Feature flags

#### 4. Build

**Development build:**
```bash
cd amundsen_application/static
npm run dev
```

**Production build:**
```bash
npm run build
```

#### 5. Run

**Development server:**
```bash
# From frontend root directory
python amundsen_application/wsgi.py
```

Access at: `http://localhost:5000`

**Docker:**
```bash
# Build image
docker-compose build catalogfrontend

# Run container
docker-compose up -d catalogfrontend
```

Access at: `http://localhost:8080`

---

## 📁 Project Structure

```
frontend/
├── amundsen_application/
│   ├── api/                          # Flask API routes
│   ├── base/                         # Base client implementations
│   ├── models/                       # Python data models
│   ├── proxy/                        # API proxy layer
│   ├── static/                       # React frontend source
│   │   ├── js/
│   │   │   ├── pages/               # Page components (21 pages)
│   │   │   │   ├── HomePage/
│   │   │   │   ├── ClusterTopologyPage/
│   │   │   │   ├── LogAnalyticsPage/
│   │   │   │   ├── PostmanPage/
│   │   │   │   ├── QueryWorkbenchPage/
│   │   │   │   ├── PersistedDataPage/
│   │   │   │   └── ...
│   │   │   ├── components/          # Reusable components (34 components)
│   │   │   │   ├── PostmanInterface/
│   │   │   │   ├── DataCatalogAssistant/
│   │   │   │   ├── Alert/
│   │   │   │   ├── Card/
│   │   │   │   └── ...
│   │   │   ├── features/            # Feature modules (19 features)
│   │   │   │   └── HomePageWidgets/
│   │   │   │       ├── ClusterHealthWidget/
│   │   │   │       ├── AgentMetricsWidget/
│   │   │   │       ├── PersistedDataWidget/
│   │   │   │       └── ...
│   │   │   ├── ducks/               # Redux state (14 modules)
│   │   │   │   ├── search/
│   │   │   │   ├── tableMetadata/
│   │   │   │   ├── bookmark/
│   │   │   │   └── ...
│   │   │   ├── config/              # Configuration
│   │   │   │   ├── config-default.ts
│   │   │   │   ├── config-custom.ts
│   │   │   │   ├── apiConfig.ts
│   │   │   │   └── routes.ts
│   │   │   ├── interfaces/          # TypeScript interfaces
│   │   │   └── utils/               # Utility functions
│   │   ├── css/                     # SCSS stylesheets
│   │   │   ├── styles.scss
│   │   │   ├── _theme-optimusddc.scss
│   │   │   └── ...
│   │   ├── images/                  # Static assets
│   │   └── templates/               # HTML templates
│   │       └── index.html
│   ├── tests/                       # Python tests
│   ├── config.py                    # Flask configuration
│   └── wsgi.py                      # WSGI entry point
├── docs/                            # Documentation
├── Dockerfile.frontend.local        # Local development Dockerfile
├── Dockerfile.frontend.public       # Production Dockerfile
├── Makefile                         # Build automation
├── package.json                     # npm configuration
├── requirements.txt                 # Python dependencies
├── setup.py                         # Python package setup
└── README.md                        # This file
```

---

## 💻 Development Guide

### Adding a New Menu Item

Follow this process for any new page:

#### 1. Create Page Component
```bash
mkdir amundsen_application/static/js/pages/YourPage
touch amundsen_application/static/js/pages/YourPage/index.tsx
touch amundsen_application/static/js/pages/YourPage/styles.scss
```

**Template (`index.tsx`):**
```tsx
import * as React from 'react';
import DocumentTitle from 'react-document-title';
import './styles.scss';

export const YOUR_PAGE_TITLE = 'Your Page Title';

const YourPage: React.FC = () => {
  return (
    <DocumentTitle title={`${YOUR_PAGE_TITLE} - OptimusDDC`}>
      <main className="container-fluid your-page">
        <div className="row">
          <div className="col-xs-12">
            {/* Your content here */}
          </div>
        </div>
      </main>
    </DocumentTitle>
  );
};

export default YourPage;
```

#### 2. Add Navigation Link
**File:** `config/config-default.ts`

```typescript
navLinks: [
  // ... existing links
  {
    href: '/your-route',
    id: 'nav::your-feature',
    label: 'Your Feature',
    use_router: true,
  },
]
```

#### 3. Add Route
**File:** `pages/routes/routes.tsx`

```typescript
import YourPage from '../YourPage';

// In the Switch component:
<Route exact path="/your-route" component={YourPage} />
```

#### 4. Build & Deploy
```bash
npm run build
docker-compose restart catalogfrontend
```

**Detailed Guide**: See `NEW_MENU_ITEM_GUIDE_OptimusDDC.md` (442 lines of comprehensive instructions)

### Development Commands

```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Start Storybook
npm run storybook
```

### Code Style

- **TypeScript**: Use strict mode, explicit types
- **React**: Functional components with hooks
- **CSS**: BEM naming convention, SCSS modules
- **Testing**: Jest + React Testing Library

### Git Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: add new feature"`
3. Run tests: `npm test`
4. Push branch: `git push origin feature/your-feature`
5. Create Pull Request

---

## 🔌 API Integration

### Dynamic Node Discovery

**File:** `config/apiConfig.ts`

```typescript
// Get available OptimusDB nodes
const nodes = await getAvailableNodes();
// Returns: [{ id: 1, name: 'optimusdb-1', host: '...', port: 18001 }, ...]

// Build API URL for specific node
const apiUrl = buildApiUrl('optimusdb', '/swarmkb/agent/status', 1);
// Docker: http://optimusdb-1:18001/swarmkb/agent/status
// K3s: http://catalogfrontend:8080/api/optimusdb/1/swarmkb/agent/status
```

### Supported APIs

#### OptimusDB API
- `GET /swarmkb/agent/status` - Agent status and cluster info
- `GET /swarmkb/logs/{date}/{hour}` - Log retrieval
- `POST /swarmkb/query` - Execute distributed query
- `GET /swarmkb/inventory` - Data inventory

#### CatalogSearch API
- `GET /api/search/v1/table` - Search tables
- `GET /api/search/v1/dashboard` - Search dashboards
- `GET /api/search/v1/user` - Search users

#### CatalogMetadata API
- `GET /api/metadata/v0/table/{cluster}/{database}/{schema}/{table}` - Table metadata
- `GET /api/metadata/v0/user/{user_id}` - User profile
- `GET /api/metadata/v0/popular_tables` - Popular resources

---

## 🚢 Deployment

### Docker Compose

**File:** `docker-compose.yml`

```yaml
services:
  catalogfrontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend.public
    ports:
      - "8080:8080"
    environment:
      - FLASK_APP=amundsen_application
      - FLASK_ENV=production
    volumes:
      - ./frontend/config:/app/config
    depends_on:
      - optimusdb-1
      - catalogsearch
      - catalogmetadata
```

**Deploy:**
```bash
docker-compose up -d catalogfrontend
```

### Kubernetes (K3s)

**File:** `k3s/catalogfrontend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalogfrontend
  namespace: optimusddc
spec:
  replicas: 2
  selector:
    matchLabels:
      app: catalogfrontend
  template:
    metadata:
      labels:
        app: catalogfrontend
    spec:
      containers:
      - name: catalogfrontend
        image: optimusddc/catalogfrontend:latest
        ports:
        - containerPort: 8080
        env:
        - name: FLASK_ENV
          value: production
```

**Deploy:**
```bash
kubectl apply -f k3s/catalogfrontend-deployment.yaml
kubectl apply -f k3s/catalogfrontend-service.yaml
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_APP` | Flask application module | `amundsen_application` |
| `FLASK_ENV` | Environment (development/production) | `production` |
| `PORT` | Server port | `8080` |
| `LOG_LEVEL` | Logging level | `INFO` |

---

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- PostmanInterface.spec.tsx
```

### Test Structure

```
amundsen_application/static/js/
├── pages/
│   └── PostmanPage/
│       └── index.spec.tsx
├── components/
│   └── PostmanInterface/
│       └── index.spec.tsx
└── ducks/
    └── search/
        └── tests/
            └── index.spec.ts
```

### Writing Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import PostmanInterface from './index';

describe('PostmanInterface', () => {
  it('renders without crashing', () => {
    render(<PostmanInterface />);
    expect(screen.getByText('API Testing Console')).toBeInTheDocument();
  });

  it('handles file import', () => {
    const { getByLabelText } = render(<PostmanInterface />);
    const fileInput = getByLabelText('Import Collection');
    
    fireEvent.change(fileInput, {
      target: { files: [new File(['{}'], 'collection.json')] }
    });
    
    expect(screen.getByText('Collection loaded')).toBeInTheDocument();
  });
});
```

---

## 📊 Performance

### Build Optimization

- **Code Splitting**: Pages loaded on-demand with React.lazy()
- **Tree Shaking**: Unused code eliminated during build
- **Minification**: JavaScript and CSS minified in production
- **Asset Optimization**: Images and fonts compressed

### Runtime Optimization

- **Memoization**: React.memo() for expensive components
- **Virtual Scrolling**: react-window for large lists
- **Debouncing**: User input debounced (search, filters)
- **Lazy Loading**: Components loaded as needed

### Metrics

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | ~1.2s |
| Time to Interactive | < 3.0s | ~2.8s |
| Largest Contentful Paint | < 2.5s | ~2.3s |
| Bundle Size | < 500KB | ~450KB |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Run linting and tests
6. Submit a pull request

### Code Review Process

- All PRs require at least one approval
- CI/CD checks must pass
- Code coverage should not decrease
- Follow existing code style

---

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright Contributors to the OptimusDDC project.
SPDX-License-Identifier: Apache-2.0
```

---

## 🙏 Acknowledgments

- **Amundsen**: Base data catalog framework
- **Athens University of Economics and Business**: Academic support
- **CENTERIS 2025**: Conference presentation platform
- **Professor Yiannis Verginadis**: PhD supervision
- **React & TypeScript communities**: Excellent documentation and support

---

## 📚 Documentation

- [Frontend Implementation Summary](docs/Frontend_Implementation_Summary.md)
- [Architecture Diagram](docs/Frontend_Architecture_Diagram.txt)
- [UI Improvement Roadmap](docs/UI_Improvement_Roadmap.md)
- [Adding New Menu Items Guide](NEW_MENU_ITEM_GUIDE_OptimusDDC.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

## 📞 Contact

**Project Lead**: George Georgakakos  
**Institution**: Athens University of Economics and Business  
**Email**: [ggeorgakakos@aueb.gr]  
**Conference**: CENTERIS 2025

---

## 🔄 Version History

### v1.0.0 (Current)
- ✅ Initial release
- ✅ 8 custom pages implemented
- ✅ 9 homepage widgets
- ✅ Full TypeScript migration
- ✅ Docker & K3s support
- ✅ Comprehensive documentation

### Roadmap
- [ ] Real-time notifications via WebSocket
- [ ] Advanced query optimization
- [ ] Custom dashboard builder
- [ ] Converstational Reporting
- [ ] Lineage

---

<p align="center">
  <strong>Built with ❤️ for distributed systems research</strong><br>
  <sub>OptimusDDC © 2024-2026</sub>
</p>

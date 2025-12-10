# 🌐 OptimusDDC - Decentralized Data Catalog

### A Distributed Metadata Discovery & Operations Platform
**Powered by OptimusDB | Built on Amundsen**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Research Project](https://img.shields.io/badge/Research-AUEB-green.svg)](https://aueb.gr)
[![Conference](https://img.shields.io/badge/CENTERIS-2025-orange.svg)](https://centeris.org)

> **Note:** This is a fork of [Amundsen](https://github.com/amundsen-io/amundsen) by Lyft, extended with decentralized capabilities and advanced operations tooling.

---

## 📖 Overview

**OptimusDDC** is a production-ready, decentralized data catalog platform that combines enterprise-grade metadata discovery with P2P networking, distributed operations monitoring, and advanced analytics capabilities.

Built as part of the **EU-funded Swarmchestrate Project** at **ICCS/AUEB**, OptimusDDC replaces traditional centralized architectures (Neo4j) with **OptimusDB**, a novel decentralized metadata engine utilizing LibP2P, OrbitDB, and IPFS.

### 🎯 **Key Innovation**

Traditional data catalogs rely on centralized databases and monitoring infrastructure. OptimusDDC demonstrates that **enterprise-grade metadata discovery and operational visibility** can be achieved in fully decentralized, P2P environments—making it ideal for:

- ✅ **Edge computing** deployments
- ✅ **Renewable energy** site monitoring
- ✅ **IoT infrastructure** management
- ✅ **Multi-site** distributed systems
- ✅ **Network partition** resilience

---

## ✨ Features

### 🔍 **Metadata Discovery** (Amundsen Foundation)
- Search datasets across distributed nodes
- Column-level lineage tracking
- User & team management
- Badge & tag system
- Table & dashboard metadata

### 📊 **Query Workbench** (Custom Development)
- **Dual-mode interface**: SQL queries + CRUD operations
- **Distributed query execution** across 8 P2P nodes
- **Query history** with favorites & search
- **Export capabilities** (CSV/JSON)
- **Monaco editor** integration with autocomplete
- **Real-time query tracing** with performance metrics

### 📋 **Log Analytics Dashboard** (Custom Development)
- **Real-time log aggregation** from all cluster nodes
- **Intelligent categorization**: Query, Peer, Election, Database, Network, OrbitDB, System
- **Advanced filtering**: 5 log levels, 9 categories, per-node filtering
- **Interactive visualizations**: Time-series, pie charts, bar charts, distributions
- **Statistics dashboard** with health metrics
- **Export & compliance**: CSV/JSON export for auditing
- **Detail inspection**: Full log context with trace IDs

### 🌐 **Network Topology** (Custom Development)
- Live P2P network visualization
- Node health monitoring
- Leader election status
- Peer connection graph
- Cluster health overview

### ⚙️ **Operations Dashboard** (Custom Development)
- Agent status monitoring across 8 nodes
- Performance metrics & trends
- Error tracking & alerting
- Distributed query analytics
- System health indicators

### 🏗️ **Decentralized Backend** (OptimusDB)
- **LibP2P** for peer-to-peer networking
- **OrbitDB** for distributed key-value storage
- **IPFS** for content-addressed data
- **SQLite** for local caching & performance
- **Reputation-based** leader election
- **Gossipsub** mesh networking
- **Split-brain** prevention mechanisms

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OptimusDDC Frontend                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Search  │  │  Query   │  │   Log    │  │  Operations  │   │
│  │Discovery │  │Workbench │  │Analytics │  │  Dashboard   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Amundsen Metadata Service (Forked)                 │
│         • OptimusDB REST Proxy Integration                      │
│         • Custom Search & Lineage Handlers                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OptimusDB Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Node 1   │  │ Node 2   │  │ Node 3   │  │  ...     │       │
│  │ :18001   │  │ :18002   │  │ :18003   │  │ :18008   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│              LibP2P P2P Network (GossipSub)                     │
│                                                                 │
│  Storage Layer:                                                 │
│  • OrbitDB (Distributed K-V Store over IPFS)                   │
│  • SQLite (Local Cache per Node)                               │
│  • TinyLlama AI (Autonomous Metadata Generation)               │
└─────────────────────────────────────────────────────────────────┘
```

### **Data Flow:**

1. **User Query** → Frontend (React/TypeScript)
2. **API Request** → Amundsen Metadata Service
3. **OptimusDB Proxy** → Distributed query execution
4. **P2P Fan-out** → Query propagates to all 8 nodes
5. **Local Execution** → Each node queries local SQLite
6. **Result Aggregation** → Merged & deduplicated
7. **Response** → Returned to user with provenance

---

## 🚀 Quick Start

### **Prerequisites**

- 🐳 Docker ≥ 24.x
- 🧩 Docker Compose ≥ 2.x
- 💻 Node.js ≥ 16.x (for frontend development)
- 🐍 Python ≥ 3.8 (for metadata service)
- 💾 At least 4 GB RAM

### **1. Clone Repository**

```bash
git clone https://github.com/georgeGeorgakakos/optimusddc.git
cd optimusddc
```

### **2. Create Docker Network**

```bash
docker network create --driver bridge swarmnet
```

### **3. Deploy OptimusDB Cluster**

```bash
# Deploy 8-node OptimusDB cluster
docker-compose -f docker-compose-optimusdb.yml up -d

# Verify cluster health
curl http://localhost:18001/swarmkb/agentstatus
```

### **4. Deploy OptimusDDC**

```bash
# Build and start all services
docker-compose -f Dockerfile.yml up --build

# Or start individually:
docker-compose up amundsen-frontend
docker-compose up amundsen-metadata
docker-compose up amundsen-search
```

### **5. Access the Platform**

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5015 | Main UI |
| **Query Workbench** | http://localhost:5015/queryworkbench | SQL & CRUD queries |
| **Log Analytics** | http://localhost:5015/logs | Distributed logs |
| **Network Topology** | http://localhost:5015/cluster/topology | P2P network viz |
| **Operations** | http://localhost:5015/operations | Ops dashboard |
| **Metadata API** | http://localhost:5002 | REST API |
| **Search API** | http://localhost:5001 | Elasticsearch |

---

## 🧰 Development Setup

### **Frontend Development**

```bash
cd amundsen_application/static

# Install dependencies
npm install

# Development build (with watch)
npm run dev-build

# Production build
npm run build

# Run locally
cd ..
python wsgi.py
```

### **Metadata Service Development**

```bash
cd metadata

# Install dependencies
pip install -e .

# Run with development server
python metadata_service/metadata_wsgi.py

# Run tests
pytest tests/
```

### **OptimusDB Local Development**

```bash
cd optimusdb

# Build Docker image
docker build -t optimusdb:latest .

# Run single node
docker run -p 18001:8089 -p 14001:4001 optimusdb:latest

# Test API
curl http://localhost:18001/swarmkb/agentstatus
```

---

## 📊 Key Components

### **1. Query Workbench**

**Location:** `amundsen_application/static/js/pages/QueryWorkbenchPage/`

**Features:**
- Dual-mode interface (SQL + CRUD)
- Distributed query execution
- Query history & favorites
- Export to CSV/JSON
- Monaco editor with autocomplete

**API Format:**
```json
{
  "method": {"argcnt": 2, "cmd": "sqldml"},
  "args": ["query", "execute"],
  "dstype": "dsswres",
  "sqldml": "SELECT * FROM datacatalogs;",
  "graph_traversal": [{}],
  "criteria": []
}
```

### **2. Log Analytics Dashboard**

**Location:** `amundsen_application/static/js/pages/LogAnalyticsPage/`

**Features:**
- Real-time aggregation from 8 nodes
- Intelligent categorization (9 categories)
- Advanced filtering (level, node, time, keyword)
- Interactive charts (timeline, pie, bar)
- Export & compliance

**Components:**
- `index.tsx` - Main orchestration
- `LogFilters.tsx` - Filter controls
- `LogViewer.tsx` - Log table
- `LogStatistics.tsx` - Metrics dashboard
- `LogCharts.tsx` - Recharts visualizations
- `LogDetailsModal.tsx` - Detail inspection

### **3. OptimusDB Backend**

**Repository:** [OptimusDB](https://github.com/georgeGeorgakakos/optimusdb)

**Technology Stack:**
- **Go** - Core implementation
- **LibP2P** - P2P networking
- **OrbitDB** - Distributed storage
- **IPFS** - Content addressing
- **SQLite** - Local cache
- **TinyLlama** - AI metadata generation

**Key Features:**
- Reputation-based leader election
- Split-brain prevention
- Query strategies (LOCAL, REMOTE, PARALLEL, QUORUM)
- Distributed trace propagation
- Autonomous metadata generation

---

## 🎓 Research Context

### **PhD Research**
**Author:** George Georgakakos  
**Institution:** Athens University of Economics and Business (AUEB)  
**Supervisor:** Professor Yiannis Verginadis  
**Topic:** Distributed Systems for Renewable Energy Metadata Management

### **Conference Presentation**
**CENTERIS 2025** - Conference on ENTERprise Information Systems  
**Paper:** "Decentralized Data Catalog for Renewable Energy Assets: A P2P Approach"

### **Key Research Questions**
1. Can enterprise-grade data catalogs operate without centralized infrastructure?
2. How to maintain observability in distributed P2P systems?
3. What are the performance tradeoffs of decentralization?
4. How to ensure metadata consistency across network partitions?

---

## 📈 Performance Metrics

### **Query Performance**

| Metric | Centralized (Neo4j) | Decentralized (OptimusDB) |
|--------|---------------------|---------------------------|
| Simple Query | 45ms | 52ms (+15%) |
| Complex Join | 120ms | 185ms (+54%) |
| Fan-out Query | N/A | 95ms (8 nodes) |
| Network Partition | ❌ Fails | ✅ Continues |
| Scalability | Vertical | Horizontal |

### **Log Analytics Performance**

| Metric | Value |
|--------|-------|
| Aggregation (8 nodes) | < 1 second |
| Search (10K logs) | < 100ms |
| Chart rendering | Instant |
| Export (1K logs) | < 200ms |
| Memory usage | ~50MB |

### **System Specifications**

- **8 OptimusDB nodes** (Docker containers)
- **Intel i7** / **16GB RAM** per node
- **Network:** 1Gbps LAN
- **Storage:** SSD, ~100MB per node

---

## 🌟 Novel Contributions

### **1. Hybrid Architecture**
- **Local SQLite** for performance
- **Distributed OrbitDB** for resilience
- **P2P LibP2P** for scalability

### **2. Operations Without Centralization**
- Distributed log aggregation
- P2P-aware monitoring
- Decentralized query execution

### **3. Edge-Optimized Design**
- Minimal bandwidth usage
- Local-first queries
- Eventual consistency

### **4. AI-Powered Metadata**
- TinyLlama integration
- Autonomous classification
- Contextual enrichment

---

## 🛠️ Technology Stack

### **Frontend**
- React 17 + TypeScript
- Redux (state management)
- Recharts (visualizations)
- Monaco Editor (code editing)
- SCSS (styling)

### **Backend (Amundsen Fork)**
- Python 3.8
- Flask (REST API)
- Elasticsearch (search)
- Custom OptimusDB proxy

### **OptimusDB**
- Go 1.21
- LibP2P (networking)
- OrbitDB (storage)
- IPFS (content addressing)
- SQLite (local cache)
- TinyLlama (AI)

### **DevOps**
- Docker & Docker Compose
- GitHub Actions (CI/CD)
- PowerShell (automation)

---

## 📂 Repository Structure

```
optimusddc/
├── amundsen_application/          # Frontend (React/TypeScript)
│   └── static/js/
│       ├── pages/
│       │   ├── QueryWorkbenchPage/     # SQL & CRUD interface
│       │   ├── LogAnalyticsPage/       # Log aggregation & viz
│       │   ├── TopologyPage/           # Network visualization
│       │   └── OperationsPage/         # Ops dashboard
│       ├── components/                 # Reusable UI components
│       └── config/
│           └── config-default.ts       # App configuration
│
├── metadata/                      # Amundsen Metadata Service (Fork)
│   ├── proxy/optimus/
│   │   └── optimusdb_proxy.py          # OptimusDB REST client
│   └── metadata_service/
│       └── api/                        # REST API endpoints
│
├── search/                        # Elasticsearch integration
│
├── dockerDDC.yml                  # Docker Compose deployment
├── docker-compose-optimusdb.yml   # OptimusDB cluster setup
├── README.md                      # This file
└── docs/                          # Additional documentation
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    ├── DEPLOYMENT_GUIDE.md
    └── CENTERIS_2025_DEMO.md
```

---

## 🔧 Configuration

### **Frontend Config**
**File:** `amundsen_application/static/js/config/config-default.ts`

```typescript
{
  navLinks: [
    { href: '/queryworkbench', label: 'Query Workbench' },
    { 
      label: 'Operations',
      submenu: [
        { href: '/logs', label: 'Log Analytics' },
        { href: '/operations', label: 'Operations Dashboard' },
        { href: '/cluster/topology', label: 'Network Topology' },
      ]
    }
  ],
  // ... other config
}
```

### **OptimusDB Config**
**File:** `optimusdb/config.yaml`

```yaml
node:
  id: "node-1"
  listen_addr: "/ip4/0.0.0.0/tcp/4001"
  
storage:
  sqlite_path: "./data/metadata.db"
  orbitdb_path: "./data/orbitdb"
  
network:
  bootstrap_peers: []
  gossipsub_mesh_size: 8
  
api:
  port: 8089
  cors_enabled: true
```

---

## 🧪 Testing

### **Unit Tests**

```bash
# Frontend
cd amundsen_application/static
npm test

# Metadata service
cd metadata
pytest tests/unit/

# OptimusDB
cd optimusdb
go test ./...
```

### **Integration Tests**

```bash
# End-to-end test suite
./scripts/run_integration_tests.sh

# Specific component
pytest tests/integration/test_query_workbench.py
```

### **Load Testing**

```bash
# Query performance
./scripts/benchmark_queries.sh

# Log aggregation stress test
./scripts/test_log_aggregation.sh
```

---

## 📚 Documentation

### **User Guides**
- [Getting Started](docs/GETTING_STARTED.md)
- [Query Workbench Guide](docs/QUERY_WORKBENCH.md)
- [Log Analytics Guide](docs/LOG_ANALYTICS.md)
- [Operations Dashboard](docs/OPERATIONS.md)

### **Developer Guides**
- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Development Setup](docs/DEVELOPMENT.md)

### **Research Documentation**
- [CENTERIS 2025 Demo Script](docs/CENTERIS_2025_DEMO.md)
- [Performance Benchmarks](docs/BENCHMARKS.md)
- [Decentralization Tradeoffs](docs/TRADEOFFS.md)

---

## 🎯 Roadmap

### **Phase 1: Core Platform** ✅ (Completed)
- [x] Amundsen fork & OptimusDB integration
- [x] Query Workbench (SQL + CRUD)
- [x] Log Analytics dashboard
- [x] Network topology visualization
- [x] Operations dashboard

### **Phase 2: Advanced Features** 🔄 (In Progress)
- [ ] Alerting system (email/Slack)
- [ ] Historical log archive (IPFS)
- [ ] ML-based anomaly detection
- [ ] Custom dashboard builder
- [ ] Multi-cluster federation

### **Phase 3: Production Hardening** 📅 (Q2 2025)
- [ ] Authentication & authorization
- [ ] RBAC for operations
- [ ] Audit trail encryption
- [ ] Performance optimization
- [ ] Kubernetes deployment

### **Phase 4: Community & Ecosystem** 📅 (Q3 2025)
- [ ] Plugin architecture
- [ ] Community connectors
- [ ] Marketplace for extensions
- [ ] SaaS offering

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### **Ways to Contribute**
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests
- 🧪 Write tests
- 📊 Share benchmarks

### **Development Process**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 🏆 Credits

### **Project Lead**
**George Georgakakos**  
Athens University of Economics and Business (AUEB)   
📧 george.georgakakos@gmail.com  
🔗 [LinkedIn](https://linkedin.com/in/georgegeorgakakos)


### **Institution**
**Institute of Communications and Computer Systems (ICCS)**  
National Technical University of Athens  
Swarmchestrate R&D Team

### **Based On**
This project is a fork of **[Amundsen](https://github.com/amundsen-io/amundsen)** by Lyft  
© Lyft, Inc. - Apache License 2.0

### **Funding**
This work is part of the **Swarmchestrate Project**, funded under the **European Union's Horizon Europe Research and Innovation Programme**.

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file.

**Amundsen components** retain their original Apache License 2.0.

**OptimusDB** is licensed under MIT License.

---

## 📊 Project Statistics

![GitHub Stars](https://img.shields.io/github/stars/georgeGeorgakakos/optimusddc?style=social)
![GitHub Forks](https://img.shields.io/github/forks/georgeGeorgakakos/optimusddc?style=social)
![Contributors](https://img.shields.io/github/contributors/georgeGeorgakakos/optimusddc)
![Last Commit](https://img.shields.io/github/last-commit/georgeGeorgakakos/optimusddc)

---

## 🌐 Links

- **OptimusDB Repository:** https://github.com/georgeGeorgakakos/optimusdb
- **Amundsen (Original):** https://github.com/amundsen-io/amundsen
- **ICCS/AUEB:** https://www.iccs.gr
- **Swarmchestrate Project:** https://swarmchestrate.eu
- **CENTERIS 2025:** https://centeris.org

---

## 📞 Support

### **Issues & Questions**
- GitHub Issues: https://github.com/georgeGeorgakakos/optimusddc/issues
- Email: george.georgakakos@gmail.com

### **Community**
- Discussions: https://github.com/georgeGeorgakakos/optimusddc/discussions
- Slack: [Join our workspace](#)

---

## 📖 Citation

If you use OptimusDDC in your research, please cite:

```bibtex
@inproceedings{georgakakos2025optimusddc,
  title={Decentralized Data Catalog for Renewable Energy Assets: A P2P Approach},
  author={Georgakakos, George and Verginadis, Yiannis},
  booktitle={Proceedings of CENTERIS 2025},
  year={2025},
  organization={ICCS/AUEB}
}
```

---

## 🙏 Acknowledgments

- **Lyft** for creating Amundsen
- **ICCS/AUEB** for research support
- **EU Swarmchestrate** for funding
- **CENTERIS 2025** reviewers for feedback
- **Open source community** for libraries and tools

---

## ⚡ Quick Links

| Resource | Link |
|----------|------|
| **Demo Video** | [Watch Demo](#) |
| **Live Demo** | [Try It](#) |
| **Documentation** | [Read Docs](docs/) |
| **API Reference** | [API Docs](docs/API_REFERENCE.md) |
| **Tutorial** | [Get Started](docs/GETTING_STARTED.md) |

---

<div align="center">

**Built with ❤️ at ICCS/AUEB**

**Powered by OptimusDB | Based on Amundsen**

[Report Bug](https://github.com/georgeGeorgakakos/optimusddc/issues) ·
[Request Feature](https://github.com/georgeGeorgakakos/optimusddc/issues) ·
[Documentation](docs/)

</div>

---

© 2025 George Georgakakos, ICCS/AUEB — MIT License

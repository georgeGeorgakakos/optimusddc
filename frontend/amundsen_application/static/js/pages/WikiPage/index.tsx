// Copyright Contributors to the Amundsen project.
// SPDX-License-Identifier: Apache-2.0
// Swarmchestrate Wiki Page
// VERSION: WIKI-1.1 (ESLint Fixed)

import * as React from 'react';
import './styles.scss';

// ==================== TYPES ====================

interface WikiSection {
  id: string;
  title: string;
  icon: string;
  subsections?: { id: string; title: string }[];
}

interface StepProps {
  stepNum: number;
  text: string;
  actor: string;
  colorClass: string;
}

interface SequenceArrowProps {
  label: string;
  colorClass: string;
  dashed?: boolean;
}

// ==================== WIKI SECTIONS ====================

const WIKI_SECTIONS: WikiSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: '🏠',
    subsections: [
      { id: 'what-is', title: 'What is Swarmchestrate?' },
      { id: 'key-features', title: 'Key Features' },
      { id: 'architecture', title: 'Architecture' },
    ],
  },
  {
    id: 'setup',
    title: 'Setup Procedures',
    icon: '⚙️',
    subsections: [
      { id: 'tzero', title: 'Setup at T₀' },
      { id: 'app-execution', title: 'Application Execution' },
      { id: 'swarm-setup', title: 'Setup of Swarm' },
    ],
  },
  {
    id: 'sequence',
    title: 'Sequence Diagram',
    icon: '📊',
    subsections: [
      { id: 'phase1', title: 'Phase 1: Setup at T₀' },
      { id: 'phase2', title: 'Phase 2: Orchestrator Setup' },
      { id: 'phase3', title: 'Phase 3: App Execution' },
      { id: 'phase4', title: 'Phase 4: Swarm Creation' },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    icon: '🧩',
    subsections: [
      { id: 'knowledge-base', title: 'Knowledge Base (KB)' },
      { id: 'resource-agent', title: 'Resource Agent (RA)' },
      { id: 'swarm-agent', title: 'Swarm Agent (SA)' },
      { id: 'epm', title: 'Execution Plan Manager' },
      { id: 'k3s', title: 'K3s Cluster' },
    ],
  },
  {
    id: 'actors',
    title: 'Actors & Roles',
    icon: '👥',
    subsections: [
      { id: 'system-admin', title: 'System Admin' },
      { id: 'capacity-provider', title: 'Capacity Provider' },
      { id: 'app-owner', title: 'Application Owner' },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    icon: '📖',
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: '🔌',
    subsections: [
      { id: 'endpoints', title: 'Endpoints' },
      { id: 'adt-schema', title: 'ADT Schema' },
    ],
  },
];

// ==================== STEP COMPONENT ====================

const StepCard: React.FC<StepProps> = ({
  stepNum,
  text,
  actor,
  colorClass,
}) => (
  <div className="step-card">
    <div className={`step-number ${colorClass}`}>{stepNum}</div>
    <div className="step-content">
      <p className="step-text">{text}</p>
      <p className="step-actor">{actor}</p>
    </div>
  </div>
);

// ==================== SEQUENCE ARROW COMPONENT ====================

const SequenceArrow: React.FC<SequenceArrowProps> = ({
  label,
  colorClass,
  dashed,
}) => (
  <div className={`sequence-arrow ${colorClass} ${dashed ? 'dashed' : ''}`}>
    <div className="arrow-line" />
    <div className="arrow-label">{label}</div>
    <div className="arrow-head" />
  </div>
);

// ==================== GLOSSARY DATA ====================

const GLOSSARY_ITEMS = [
  {
    term: 'ADT',
    full: 'Application Deployment Template',
    desc: 'A YAML/JSON specification that defines all components, resources, and configurations needed to deploy an application.',
  },
  {
    term: 'EPM',
    full: 'Execution Plan Manager',
    desc: 'Component responsible for coordinating the deployment sequence and managing dependencies between microservices.',
  },
  {
    term: 'K3s',
    full: 'Lightweight Kubernetes',
    desc: 'A certified Kubernetes distribution optimized for edge computing and resource-constrained environments.',
  },
  {
    term: 'KB',
    full: 'Knowledge Base',
    desc: 'Centralized repository storing capacity registrations, resource metadata, and system state information.',
  },
  {
    term: 'RA',
    full: 'Resource Agent',
    desc: 'Autonomous software component that manages computing resources and participates in decentralized orchestration.',
  },
  {
    term: 'SA',
    full: 'Swarm Agent',
    desc: 'Agent running within K3s clusters responsible for managing application microservice lifecycles.',
  },
  {
    term: 'Coordinator RA',
    full: 'Coordinator Resource Agent',
    desc: 'Special RA that orchestrates resource allocation and coordinates swarm creation across the network.',
  },
  {
    term: 'Lead RA',
    full: 'Lead Resource Agent',
    desc: 'RA selected to create the K3s control plane and spawn initial swarm components.',
  },
  {
    term: 'Swarm',
    full: 'K3s Cluster',
    desc: 'A dynamically created Kubernetes cluster for running application workloads.',
  },
  {
    term: 'T₀',
    full: 'Time Zero',
    desc: 'Initial system setup phase where infrastructure components are deployed.',
  },
  {
    term: 'Capacity ID',
    full: 'Capacity Identifier',
    desc: 'Unique identifier assigned to registered computing resources in the Knowledge Base.',
  },
  {
    term: 'Control Plane',
    full: 'K3s Control Plane',
    desc: 'The master node of a K3s cluster that manages cluster state and scheduling.',
  },
];

// ==================== MAIN WIKI COMPONENT ====================

const WikiPage: React.FC = () => {
  const [activeSection, setActiveSection] = React.useState('overview');
  const [activeSubsection, setActiveSubsection] = React.useState('what-is');
  const [expandedSections, setExpandedSections] = React.useState<string[]>([
    'overview',
    'setup',
    'sequence',
  ]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navigateTo = (sectionId: string, subsectionId?: string) => {
    setActiveSection(sectionId);
    if (subsectionId) {
      setActiveSubsection(subsectionId);
    } else {
      const section = WIKI_SECTIONS.find((s) => s.id === sectionId);

      if (section?.subsections?.[0]) {
        setActiveSubsection(section.subsections[0].id);
      } else {
        setActiveSubsection('');
      }
    }
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections((prev) => [...prev, sectionId]);
    }
  };

  // ==================== OVERVIEW SECTION ====================

  const renderOverview = () => (
    <div className="wiki-content">
      <div className="content-header">
        <h1>🐝 Swarmchestrate Overview</h1>
        <p className="subtitle">Decentralized Cloud Orchestration Platform</p>
      </div>

      {activeSubsection === 'what-is' && (
        <section className="content-section">
          <h2>What is Swarmchestrate?</h2>
          <div className="info-card highlight">
            <p>
              <strong>Swarmchestrate</strong> is a decentralized cloud
              orchestration platform that enables autonomous deployment and
              management of distributed applications across heterogeneous
              computing resources using intelligent Resource Agents and
              lightweight Kubernetes (K3s) clusters.
            </p>
          </div>

          <h3>Core Principles</h3>
          <div className="principles-grid">
            <div className="principle-card">
              <span className="principle-icon">🌐</span>
              <h4>Decentralized</h4>
              <p>
                No single point of failure with distributed Resource Agents
                managing resources autonomously.
              </p>
            </div>
            <div className="principle-card">
              <span className="principle-icon">🤖</span>
              <h4>AI-Powered</h4>
              <p>
                Intelligent resource ranking and allocation using AI algorithms
                for optimal placement.
              </p>
            </div>
            <div className="principle-card">
              <span className="principle-icon">☸️</span>
              <h4>Kubernetes-Native</h4>
              <p>
                Built on K3s for lightweight, production-grade container
                orchestration.
              </p>
            </div>
            <div className="principle-card">
              <span className="principle-icon">📋</span>
              <h4>Template-Driven</h4>
              <p>
                Application Deployment Templates (ADT) define complete
                application specifications.
              </p>
            </div>
          </div>
        </section>
      )}

      {activeSubsection === 'key-features' && (
        <section className="content-section">
          <h2>Key Features</h2>
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon">✅</div>
              <div className="feature-content">
                <h4>Autonomous Resource Management</h4>
                <p>
                  Resource Agents automatically discover, register, and manage
                  computing capacity across the network.
                </p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✅</div>
              <div className="feature-content">
                <h4>Dynamic Swarm Creation</h4>
                <p>
                  K3s clusters are created on-demand based on application
                  requirements and available resources.
                </p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✅</div>
              <div className="feature-content">
                <h4>Intelligent Placement</h4>
                <p>
                  AI-powered algorithms rank and select optimal resources for
                  application deployment.
                </p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✅</div>
              <div className="feature-content">
                <h4>Knowledge Base Integration</h4>
                <p>
                  Centralized knowledge repository for capacity registration and
                  metadata management.
                </p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✅</div>
              <div className="feature-content">
                <h4>Multi-Tenant Support</h4>
                <p>
                  Isolated environments for different applications and
                  organizations.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeSubsection === 'architecture' && (
        <section className="content-section">
          <h2>System Architecture</h2>
          <div className="architecture-diagram">
            <div className="arch-layer">
              <div className="layer-title">Application Layer</div>
              <div className="layer-items">
                <div className="arch-item green">Application Owner</div>
                <div className="arch-item green">Client Tools</div>
                <div className="arch-item green">ADT Templates</div>
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="layer-title">Orchestration Layer</div>
              <div className="layer-items">
                <div className="arch-item blue">Coordinator RA</div>
                <div className="arch-item blue">Resource Agents</div>
                <div className="arch-item blue">Knowledge Base</div>
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="layer-title">Execution Layer</div>
              <div className="layer-items">
                <div className="arch-item orange">K3s Clusters</div>
                <div className="arch-item orange">Swarm Agents</div>
                <div className="arch-item orange">EPM</div>
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="layer-title">Infrastructure Layer</div>
              <div className="layer-items">
                <div className="arch-item purple">Compute Resources</div>
                <div className="arch-item purple">Network</div>
                <div className="arch-item purple">Storage</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  // ==================== SETUP SECTION ====================

  const renderSetup = () => (
    <div className="wiki-content">
      <div className="content-header">
        <h1>⚙️ Setup Procedures</h1>
        <p className="subtitle">Complete Workflow Overview</p>
      </div>

      {/* Process Flow Summary */}
      <div className="process-flow">
        <div className="flow-step" onClick={() => setActiveSubsection('tzero')}>
          <div className="flow-icon purple">T₀</div>
          <div className="flow-label">Setup</div>
        </div>
        <div className="flow-arrow">→</div>
        <div
          className="flow-step"
          onClick={() => setActiveSubsection('app-execution')}
        >
          <div className="flow-icon green">📱</div>
          <div className="flow-label">App Submission</div>
        </div>
        <div className="flow-arrow">→</div>
        <div
          className="flow-step"
          onClick={() => setActiveSubsection('swarm-setup')}
        >
          <div className="flow-icon orange">🐝</div>
          <div className="flow-label">Swarm Creation</div>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <div className="flow-icon red">✓</div>
          <div className="flow-label">Running</div>
        </div>
      </div>

      {activeSubsection === 'tzero' && (
        <section className="content-section">
          <div className="section-header purple">
            <h2>Setup at T₀</h2>
            <span className="section-badge">Initial System Configuration</span>
          </div>

          <div className="steps-container">
            <StepCard
              stepNum={1}
              text="Knowledge Base is deployed as a service"
              actor="by System Admin"
              colorClass="purple"
            />
            <StepCard
              stepNum={2}
              text="Capacity is registered in KB"
              actor="by Capacity Provider"
              colorClass="blue"
            />
            <StepCard
              stepNum={3}
              text="Registered Capacity ID is collected from KB"
              actor="by Capacity Provider"
              colorClass="blue"
            />
            <StepCard
              stepNum={4}
              text="Resource Agent is deployed with Capacity ID"
              actor="by Capacity Provider"
              colorClass="blue"
            />
            <StepCard
              stepNum={5}
              text="Resource Agent joins to other RAs and is ready to accept ADTs"
              actor="by Capacity Provider"
              colorClass="blue"
            />
          </div>

          <div className="info-callout">
            <span className="callout-icon">💡</span>
            <div className="callout-content">
              <strong>Important:</strong> T₀ setup only needs to be performed
              once when initially deploying the Swarmchestrate infrastructure.
              Subsequent applications can skip directly to the Application
              Execution phase.
            </div>
          </div>
        </section>
      )}

      {activeSubsection === 'app-execution' && (
        <section className="content-section">
          <div className="section-header green">
            <h2>Application Execution</h2>
            <span className="section-badge">Application Lifecycle</span>
          </div>

          <div className="steps-container">
            <StepCard
              stepNum={1}
              text="ADT is created (may use helper tool e.g. GUI)"
              actor="by Application Owner"
              colorClass="green"
            />
            <StepCard
              stepNum={2}
              text="An RA is selected, endpoint collected"
              actor="by Application Owner"
              colorClass="green"
            />
            <StepCard
              stepNum={3}
              text="ADT is submitted to the selected RA using a client tool"
              actor="by Application Owner"
              colorClass="green"
            />
            <StepCard
              stepNum={4}
              text="Application is observed, manipulated using the client tool"
              actor="by Application Owner"
              colorClass="green"
            />
            <StepCard
              stepNum={5}
              text="Application finishes with shutdown command using the client tool"
              actor="by Application Owner"
              colorClass="green"
            />
          </div>

          <div className="code-example">
            <div className="code-header">
              <span>📄 Example: Submit ADT via CLI</span>
            </div>
            <pre className="code-block">
              {`# Submit application deployment template
swarmctl submit --adt ./my-application.yaml --ra endpoint:8080

# Monitor application status
swarmctl status --app my-application

# Shutdown application
swarmctl shutdown --app my-application`}
            </pre>
          </div>
        </section>
      )}

      {activeSubsection === 'swarm-setup' && (
        <section className="content-section">
          <div className="section-header orange">
            <h2>Setup of Swarm</h2>
            <span className="section-badge">Distributed Orchestration</span>
          </div>

          <div className="steps-container">
            <StepCard
              stepNum={1}
              text="Application ADT is submitted"
              actor="by Application Owner"
              colorClass="green"
            />
            <StepCard
              stepNum={2}
              text="Coordinator RA distributes resource requirements and collects offers from RAs"
              actor="automated process"
              colorClass="orange"
            />
            <StepCard
              stepNum={3}
              text="Coordinator RA ranks offered resources (using AI algorithm)"
              actor="automated process"
              colorClass="orange"
            />
            <StepCard
              stepNum={4}
              text="Coordinator RA selects the lead RA responsible for creating the swarm"
              actor="automated process"
              colorClass="orange"
            />
            <StepCard
              stepNum={5}
              text="Lead RA creates the first node of K3s as control plane of the Swarm"
              actor="automated process"
              colorClass="orange"
            />
            <StepCard
              stepNum={6}
              text="Lead RA spawns Lead Swarm Agent on the control plane of newly created K3s"
              actor="automated process"
              colorClass="red"
            />
            <StepCard
              stepNum={7}
              text="Lead RA spawns EPM on the control plane of the newly created K3s"
              actor="automated process"
              colorClass="red"
            />
            <StepCard
              stepNum={8}
              text="Other RAs are deploying further nodes of the K3s cluster"
              actor="automated process"
              colorClass="red"
            />
            <StepCard
              stepNum={9}
              text="Lead SA spawns the microservices of the application"
              actor="automated process"
              colorClass="red"
            />
            <StepCard
              stepNum={10}
              text="Application is running"
              actor="final state"
              colorClass="green"
            />
          </div>
        </section>
      )}
    </div>
  );

  // ==================== SEQUENCE SECTION ====================

  const renderSequence = () => (
    <div className="wiki-content">
      <div className="content-header">
        <h1>📊 Sequence Diagram</h1>
        <p className="subtitle">Complete System Workflow</p>
      </div>

      {/* Phase Navigation */}
      <div className="phase-nav">
        <button
          type="button"
          className={`phase-btn ${
            activeSubsection === 'phase1' ? 'active purple' : ''
          }`}
          onClick={() => setActiveSubsection('phase1')}
        >
          Phase 1: T₀
        </button>
        <button
          type="button"
          className={`phase-btn ${
            activeSubsection === 'phase2' ? 'active blue' : ''
          }`}
          onClick={() => setActiveSubsection('phase2')}
        >
          Phase 2: Orchestrator
        </button>
        <button
          type="button"
          className={`phase-btn ${
            activeSubsection === 'phase3' ? 'active green' : ''
          }`}
          onClick={() => setActiveSubsection('phase3')}
        >
          Phase 3: Execution
        </button>
        <button
          type="button"
          className={`phase-btn ${
            activeSubsection === 'phase4' ? 'active red' : ''
          }`}
          onClick={() => setActiveSubsection('phase4')}
        >
          Phase 4: Swarm
        </button>
      </div>

      {/* Actors Row */}
      <div className="actors-row">
        <div className="actor-item purple">
          <div className="actor-icon">👤</div>
          <span>System Admin</span>
        </div>
        <div className="actor-item blue">
          <div className="actor-icon">👤</div>
          <span>Capacity Provider</span>
        </div>
        <div className="actor-item indigo">
          <div className="actor-icon">🎯</div>
          <span>Orchestrator</span>
        </div>
        <div className="actor-item cyan">
          <div className="actor-icon">⚙️</div>
          <span>Coordinator RA</span>
        </div>
        <div className="actor-item teal">
          <div className="actor-icon">📚</div>
          <span>Knowledge Base</span>
        </div>
        <div className="actor-item amber">
          <div className="actor-icon">🤖</div>
          <span>Resource Agents</span>
        </div>
        <div className="actor-item green">
          <div className="actor-icon">👤</div>
          <span>App Owner</span>
        </div>
        <div className="actor-item rose">
          <div className="actor-icon">☸️</div>
          <span>K3s Swarm</span>
        </div>
      </div>

      {activeSubsection === 'phase1' && (
        <section className="sequence-section">
          <div className="sequence-header purple">
            <h3>Phase 1: Setup at T₀</h3>
          </div>
          <div className="sequence-content">
            <SequenceArrow
              label="1. Deploy Knowledge Base as service"
              colorClass="purple"
            />
            <SequenceArrow
              label="2. Register Capacity in KB"
              colorClass="blue"
            />
            <SequenceArrow
              label="3. Return Capacity ID"
              colorClass="blue"
              dashed
            />
            <SequenceArrow
              label="4. Deploy Resource Agent with Capacity ID"
              colorClass="blue"
            />
            <SequenceArrow
              label="5. RAs join network and ready to accept ADTs"
              colorClass="blue"
              dashed
            />
          </div>
        </section>
      )}

      {activeSubsection === 'phase2' && (
        <section className="sequence-section">
          <div className="sequence-header indigo">
            <h3>Phase 2: Orchestrator Setup (Per New Application)</h3>
          </div>
          <div className="info-banner">📌 Per new application definition</div>
          <div className="sequence-content">
            <SequenceArrow
              label="Start RAs (available globally)"
              colorClass="orange"
            />
            <SequenceArrow
              label="Take actions to start New Swarmchestrate Application"
              colorClass="orange"
            />
            <SequenceArrow
              label="Start Knowledge Base in private K3s cluster"
              colorClass="orange"
            />
            <SequenceArrow
              label="Inform RAs about the Knowledge Base for new application"
              colorClass="orange"
            />
          </div>
        </section>
      )}

      {activeSubsection === 'phase3' && (
        <section className="sequence-section">
          <div className="sequence-header green">
            <h3>Phase 3: Application Execution</h3>
          </div>
          <div className="sequence-content">
            <SequenceArrow
              label="1. Create ADT (using helper tool/GUI)"
              colorClass="green"
              dashed
            />
            <SequenceArrow
              label="2. Select RA and collect endpoint"
              colorClass="green"
            />
            <SequenceArrow
              label="3. Submit ADT to selected RA using client tool"
              colorClass="green"
            />
            <SequenceArrow
              label="4. Observe & manipulate application using client tool"
              colorClass="green"
              dashed
            />
            <SequenceArrow
              label="5. Shutdown application with command"
              colorClass="green"
            />
          </div>
        </section>
      )}

      {activeSubsection === 'phase4' && (
        <section className="sequence-section">
          <div className="sequence-header red">
            <h3>Phase 4: Setup of Swarm (Automated Orchestration)</h3>
          </div>
          <div className="sequence-content">
            <SequenceArrow
              label="1. Submit Application ADT"
              colorClass="green"
            />
            <SequenceArrow
              label="2. Distribute requirements & collect resource offers"
              colorClass="orange"
            />
            <SequenceArrow
              label="Resource offers response"
              colorClass="orange"
              dashed
            />
            <SequenceArrow
              label="3. Rank offered resources (AI algorithm)"
              colorClass="orange"
              dashed
            />
            <SequenceArrow
              label="4. Select Lead RA for swarm creation"
              colorClass="orange"
            />
            <SequenceArrow
              label="5. Lead RA creates first K3s node (control plane)"
              colorClass="red"
            />
            <SequenceArrow
              label="6. Lead RA spawns Lead Swarm Agent on control plane"
              colorClass="red"
            />
            <SequenceArrow
              label="7. Lead RA spawns EPM on control plane"
              colorClass="red"
            />
            <SequenceArrow
              label="8. Other RAs deploy additional K3s nodes"
              colorClass="red"
            />
            <SequenceArrow
              label="9. Lead SA spawns application microservices"
              colorClass="red"
              dashed
            />
            <div className="success-banner">✓ 10. Application is Running</div>
          </div>
        </section>
      )}
    </div>
  );

  // ==================== COMPONENTS SECTION ====================

  const renderComponents = () => (
    <div className="wiki-content">
      <div className="content-header">
        <h1>🧩 Components</h1>
        <p className="subtitle">System Building Blocks</p>
      </div>

      {activeSubsection === 'knowledge-base' && (
        <section className="content-section">
          <div className="component-header teal">
            <span className="component-icon">📚</span>
            <h2>Knowledge Base (KB)</h2>
          </div>
          <p className="component-description">
            The Knowledge Base is a centralized repository that stores all
            metadata about registered capacities, resource configurations, and
            system state.
          </p>

          <h3>Responsibilities</h3>
          <ul className="component-list">
            <li>Store and manage capacity registrations</li>
            <li>Generate and track Capacity IDs</li>
            <li>Maintain resource metadata and availability</li>
            <li>Provide discovery services for Resource Agents</li>
          </ul>

          <h3>Deployment</h3>
          <div className="code-example">
            <pre className="code-block">
              {`# Deploy Knowledge Base
kubectl apply -f knowledge-base.yaml

# Verify deployment
kubectl get pods -l app=knowledge-base`}
            </pre>
          </div>
        </section>
      )}

      {activeSubsection === 'resource-agent' && (
        <section className="content-section">
          <div className="component-header amber">
            <span className="component-icon">🤖</span>
            <h2>Resource Agent (RA)</h2>
          </div>
          <p className="component-description">
            Resource Agents are autonomous software components that manage
            computing resources and participate in the decentralized
            orchestration network.
          </p>

          <h3>Responsibilities</h3>
          <ul className="component-list">
            <li>Register capacity with Knowledge Base</li>
            <li>Accept and process ADT submissions</li>
            <li>Participate in resource negotiation</li>
            <li>Deploy and manage K3s cluster nodes</li>
            <li>Communicate with other RAs in the network</li>
          </ul>

          <h3>Types</h3>
          <div className="types-grid">
            <div className="type-card">
              <h4>Coordinator RA</h4>
              <p>Orchestrates resource allocation and swarm creation</p>
            </div>
            <div className="type-card">
              <h4>Lead RA</h4>
              <p>Creates control plane and spawns initial components</p>
            </div>
            <div className="type-card">
              <h4>Worker RA</h4>
              <p>Deploys worker nodes to extend the cluster</p>
            </div>
          </div>
        </section>
      )}

      {activeSubsection === 'swarm-agent' && (
        <section className="content-section">
          <div className="component-header rose">
            <span className="component-icon">🐝</span>
            <h2>Swarm Agent (SA)</h2>
          </div>
          <p className="component-description">
            Swarm Agents run within K3s clusters and are responsible for
            managing the lifecycle of application microservices.
          </p>

          <h3>Responsibilities</h3>
          <ul className="component-list">
            <li>Spawn and manage application microservices</li>
            <li>Monitor application health</li>
            <li>Report status to Resource Agents</li>
            <li>Handle scaling and updates</li>
          </ul>
        </section>
      )}

      {activeSubsection === 'epm' && (
        <section className="content-section">
          <div className="component-header indigo">
            <span className="component-icon">📋</span>
            <h2>Execution Plan Manager (EPM)</h2>
          </div>
          <p className="component-description">
            The Execution Plan Manager coordinates the deployment sequence and
            ensures proper ordering of microservice instantiation.
          </p>

          <h3>Responsibilities</h3>
          <ul className="component-list">
            <li>Parse ADT deployment specifications</li>
            <li>Create execution plans for microservices</li>
            <li>Manage dependencies between services</li>
            <li>Coordinate with Swarm Agents for deployment</li>
          </ul>
        </section>
      )}

      {activeSubsection === 'k3s' && (
        <section className="content-section">
          <div className="component-header blue">
            <span className="component-icon">☸️</span>
            <h2>K3s Cluster</h2>
          </div>
          <p className="component-description">
            K3s is a lightweight, certified Kubernetes distribution designed for
            resource-constrained environments and edge computing.
          </p>

          <h3>Why K3s?</h3>
          <ul className="component-list">
            <li>Lightweight: ~50MB binary</li>
            <li>Fast startup: Under 1 minute</li>
            <li>Low memory: 512MB minimum</li>
            <li>Certified Kubernetes: Full API compatibility</li>
            <li>Edge-ready: Designed for distributed deployments</li>
          </ul>

          <h3>Cluster Structure</h3>
          <div className="cluster-diagram">
            <div className="cluster-node control">
              <span className="node-icon">🎛️</span>
              <span>Control Plane</span>
              <small>Created by Lead RA</small>
            </div>
            <div className="cluster-workers">
              <div className="cluster-node worker">
                <span className="node-icon">⚙️</span>
                <span>Worker 1</span>
              </div>
              <div className="cluster-node worker">
                <span className="node-icon">⚙️</span>
                <span>Worker 2</span>
              </div>
              <div className="cluster-node worker">
                <span className="node-icon">⚙️</span>
                <span>Worker N</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  // ==================== ACTORS SECTION ====================

  const renderActors = () => (
    <div className="wiki-content">
      <div className="content-header">
        <h1>👥 Actors & Roles</h1>
        <p className="subtitle">Key Participants in the System</p>
      </div>

      {activeSubsection === 'system-admin' && (
        <section className="content-section">
          <div className="actor-header purple">
            <div className="actor-avatar">👤</div>
            <h2>System Admin</h2>
          </div>

          <div className="role-description">
            <p>
              The System Administrator is responsible for the initial deployment
              and maintenance of the Swarmchestrate infrastructure.
            </p>
          </div>

          <h3>Responsibilities</h3>
          <div className="responsibilities-list">
            <div className="responsibility-item">
              <span className="resp-icon">🚀</span>
              <div>
                <h4>Deploy Knowledge Base</h4>
                <p>
                  Initial deployment of the centralized Knowledge Base service
                </p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="resp-icon">🔧</span>
              <div>
                <h4>Infrastructure Management</h4>
                <p>Maintain and monitor core system components</p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="resp-icon">🔐</span>
              <div>
                <h4>Security Configuration</h4>
                <p>Configure authentication and authorization policies</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeSubsection === 'capacity-provider' && (
        <section className="content-section">
          <div className="actor-header blue">
            <div className="actor-avatar">👤</div>
            <h2>Capacity Provider</h2>
          </div>

          <div className="role-description">
            <p>
              Capacity Providers contribute computing resources to the
              Swarmchestrate network by registering their capacity and deploying
              Resource Agents.
            </p>
          </div>

          <h3>Responsibilities</h3>
          <div className="responsibilities-list">
            <div className="responsibility-item">
              <span className="resp-icon">📝</span>
              <div>
                <h4>Register Capacity</h4>
                <p>
                  Register available computing resources in the Knowledge Base
                </p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="resp-icon">🤖</span>
              <div>
                <h4>Deploy Resource Agents</h4>
                <p>Deploy and configure Resource Agents with Capacity IDs</p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="resp-icon">📊</span>
              <div>
                <h4>Monitor Resources</h4>
                <p>Track resource utilization and availability</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeSubsection === 'app-owner' && (
        <section className="content-section">
          <div className="actor-header green">
            <div className="actor-avatar">👤</div>
            <h2>Application Owner</h2>
          </div>

          <div className="role-description">
            <p>
              Application Owners are end-users who deploy and manage
              applications on the Swarmchestrate platform using ADTs.
            </p>
          </div>

          <h3>Responsibilities</h3>
          <div className="responsibilities-list">
            <div className="responsibility-item">
              <span className="resp-icon">📄</span>
              <div>
                <h4>Create ADTs</h4>
                <p>
                  Define Application Deployment Templates for their applications
                </p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="resp-icon">🚀</span>
              <div>
                <h4>Submit Applications</h4>
                <p>Submit ADTs to Resource Agents for deployment</p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="resp-icon">👁️</span>
              <div>
                <h4>Monitor & Manage</h4>
                <p>
                  Observe application status and perform lifecycle operations
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  // ==================== GLOSSARY SECTION ====================

  const renderGlossary = () => {
    const filteredItems = GLOSSARY_ITEMS.filter(
      (item) =>
        searchQuery === '' ||
        item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.full.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="wiki-content">
        <div className="content-header">
          <h1>📖 Glossary</h1>
          <p className="subtitle">Key Terms and Definitions</p>
        </div>

        <div className="glossary-search">
          <input
            type="text"
            placeholder="🔍 Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="glossary-list">
          {filteredItems.map((item) => (
            <div key={item.term} className="glossary-item">
              <div className="glossary-term">
                <span className="term-abbr">{item.term}</span>
                <span className="term-full">{item.full}</span>
              </div>
              <p className="glossary-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==================== API SECTION ====================

  const renderAPI = () => (
    <div className="wiki-content">
      <div className="content-header">
        <h1>🔌 API Reference</h1>
        <p className="subtitle">Integration Documentation</p>
      </div>

      {activeSubsection === 'endpoints' && (
        <section className="content-section">
          <h2>REST API Endpoints</h2>

          <div className="api-endpoint">
            <div className="endpoint-header">
              <span className="method post">POST</span>
              <code>/api/v1/adt/submit</code>
            </div>
            <p className="endpoint-desc">
              Submit an Application Deployment Template
            </p>
            <div className="code-example">
              <pre className="code-block">
                {`curl -X POST http://ra-endpoint:8080/api/v1/adt/submit \\
  -H "Content-Type: application/yaml" \\
  -d @my-application.yaml`}
              </pre>
            </div>
          </div>

          <div className="api-endpoint">
            <div className="endpoint-header">
              <span className="method get">GET</span>
              <code>/api/v1/application/{'{id}'}/status</code>
            </div>
            <p className="endpoint-desc">Get application deployment status</p>
          </div>

          <div className="api-endpoint">
            <div className="endpoint-header">
              <span className="method delete">DELETE</span>
              <code>/api/v1/application/{'{id}'}</code>
            </div>
            <p className="endpoint-desc">Shutdown and remove an application</p>
          </div>

          <div className="api-endpoint">
            <div className="endpoint-header">
              <span className="method get">GET</span>
              <code>/api/v1/resources</code>
            </div>
            <p className="endpoint-desc">
              List available resources in the network
            </p>
          </div>
        </section>
      )}

      {activeSubsection === 'adt-schema' && (
        <section className="content-section">
          <h2>ADT Schema</h2>
          <p>Application Deployment Templates follow a YAML schema:</p>

          <div className="code-example">
            <div className="code-header">
              <span>📄 Example ADT</span>
            </div>
            <pre className="code-block">
              {`apiVersion: swarmchestrate/v1
kind: ApplicationDeploymentTemplate
metadata:
  name: my-microservice-app
  version: 1.0.0
spec:
  resources:
    cpu: "2"
    memory: "4Gi"
    storage: "10Gi"
  
  services:
    - name: frontend
      image: myapp/frontend:latest
      replicas: 2
      ports:
        - 80
      
    - name: backend
      image: myapp/backend:latest
      replicas: 3
      ports:
        - 8080
      depends_on:
        - database
      
    - name: database
      image: postgres:14
      replicas: 1
      ports:
        - 5432
      volumes:
        - name: db-data
          size: "5Gi"
  
  networking:
    ingress:
      enabled: true
      host: myapp.example.com`}
            </pre>
          </div>
        </section>
      )}
    </div>
  );

  // ==================== RENDER CONTENT ====================

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'setup':
        return renderSetup();
      case 'sequence':
        return renderSequence();
      case 'components':
        return renderComponents();
      case 'actors':
        return renderActors();
      case 'glossary':
        return renderGlossary();
      case 'api':
        return renderAPI();
      default:
        return renderOverview();
    }
  };

  // ==================== MAIN RENDER ====================

  return (
    <div className="wiki-page">
      {/* Sidebar */}
      <aside className={`wiki-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🐝</span>
            <span className="logo-text">Swarmchestrate</span>
          </div>
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <div className="sidebar-search">
          <input type="text" placeholder="🔍 Search docs..." />
        </div>

        <nav className="sidebar-nav">
          {WIKI_SECTIONS.map((section) => (
            <div key={section.id} className="nav-section">
              <div
                role="button"
                tabIndex={0}
                className={`nav-item ${
                  activeSection === section.id ? 'active' : ''
                }`}
                onClick={() => {
                  navigateTo(section.id);
                  if (section.subsections) {
                    toggleSection(section.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigateTo(section.id);
                    if (section.subsections) {
                      toggleSection(section.id);
                    }
                  }
                }}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-label">{section.title}</span>
                {section.subsections && (
                  <span
                    className={`nav-arrow ${
                      expandedSections.includes(section.id) ? 'expanded' : ''
                    }`}
                  >
                    ▶
                  </span>
                )}
              </div>

              {section.subsections && expandedSections.includes(section.id) && (
                <div className="nav-subsections">
                  {section.subsections.map((sub) => (
                    <div
                      key={sub.id}
                      role="button"
                      tabIndex={0}
                      className={`nav-subitem ${
                        activeSection === section.id &&
                        activeSubsection === sub.id
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => navigateTo(section.id, sub.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigateTo(section.id, sub.id);
                        }
                      }}
                    >
                      {sub.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="version-badge">v1.0.0</div>
          <a
            href="https://github.com/swarmchestrate"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="wiki-main">
        {/* Breadcrumb */}
        <div className="wiki-breadcrumb">
          <span
            role="button"
            tabIndex={0}
            onClick={() => navigateTo('overview')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigateTo('overview');
              }
            }}
          >
            Wiki
          </span>
          <span className="separator">/</span>
          <span>
            {WIKI_SECTIONS.find((s) => s.id === activeSection)?.title}
          </span>
          {activeSubsection && (
            <>
              <span className="separator">/</span>
              <span className="current">
                {
                  WIKI_SECTIONS.find(
                    (s) => s.id === activeSection
                  )?.subsections?.find((sub) => sub.id === activeSubsection)
                    ?.title
                }
              </span>
            </>
          )}
        </div>

        {/* Content */}
        {renderContent()}

        {/* Footer Navigation */}
        <div className="wiki-footer-nav">
          <div className="footer-nav-left">
            {/* Previous page logic would go here */}
          </div>
          <div className="footer-nav-right">
            {/* Next page logic would go here */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WikiPage;

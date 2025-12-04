PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS datacatalog (
    _id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    metadata_type TEXT,
    component TEXT,
    description TEXT,
    created_by TEXT,
    owners TEXT,
    tags TEXT,
    badges TEXT,
    column_descriptions TEXT,
    lineage_upstream TEXT,
    lineage_downstream TEXT,
    statistics TEXT,
    generation_code TEXT,
    ai_summary TEXT,
    ai_tags TEXT,
    ai_quality_score REAL,
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    updated_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    profile_url TEXT,
    is_active INTEGER DEFAULT 1,
    github_username TEXT,
    team_name TEXT,
    slack_id TEXT,
    employee_type TEXT,
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    updated_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS user_resource_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(resource_id, user_id, relation_type)
);

CREATE TABLE IF NOT EXISTS dashboards (
    dashboard_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    group_name TEXT,
    group_url TEXT,
    product TEXT,
    url TEXT,
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    updated_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    last_run INTEGER
);

CREATE TABLE IF NOT EXISTS resource_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT,
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(source_type, source_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS type_metadata (
    type_key TEXT PRIMARY KEY,
    type_name TEXT NOT NULL,
    description TEXT,
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_datacatalog_name ON datacatalog(name);
CREATE INDEX IF NOT EXISTS idx_datacatalog_type ON datacatalog(metadata_type);
CREATE INDEX IF NOT EXISTS idx_datacatalog_component ON datacatalog(component);
CREATE INDEX IF NOT EXISTS idx_datacatalog_tags ON datacatalog(tags);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_name);
CREATE INDEX IF NOT EXISTS idx_urr_user ON user_resource_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_urr_resource ON user_resource_relations(resource_id);
CREATE INDEX IF NOT EXISTS idx_urr_relation ON user_resource_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_dashboards_name ON dashboards(name);
CREATE INDEX IF NOT EXISTS idx_dashboards_group ON dashboards(group_name);
CREATE INDEX IF NOT EXISTS idx_rd_source ON resource_dependencies(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_rd_target ON resource_dependencies(target_type, target_id);

INSERT OR IGNORE INTO users (user_id, email, display_name, is_active, team_name)
VALUES ('system', 'system@optimusdb.local', 'System', 1, 'OptimusDB');

INSERT OR IGNORE INTO users (user_id, email, display_name, is_active, team_name)
VALUES ('admin', 'admin@optimusdb.local', 'Administrator', 1, 'OptimusDB');

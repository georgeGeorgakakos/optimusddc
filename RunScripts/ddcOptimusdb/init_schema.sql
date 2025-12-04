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
    email TEXT NOT NULL,
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
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
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
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS type_metadata (
    type_key TEXT PRIMARY KEY,
    type_name TEXT NOT NULL,
    description TEXT,
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
)

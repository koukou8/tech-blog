CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'research', 'writing', 'done')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  write_token TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ideas_updated ON ideas(updated_at DESC, id);
CREATE INDEX IF NOT EXISTS ideas_status ON ideas(status);
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE IF NOT EXISTS idea_tags (
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (idea_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idea_tags_tag ON idea_tags(tag_id, idea_id);
CREATE TABLE IF NOT EXISTS idea_references (
  id INTEGER PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idea_references_idea ON idea_references(idea_id, sort_order);

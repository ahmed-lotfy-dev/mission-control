-- Social Accounts Table
CREATE TABLE IF NOT EXISTS social_accounts (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  followers INTEGER NOT NULL DEFAULT 0,
  following INTEGER NOT NULL DEFAULT 0,
  media_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_status ON social_accounts(status);

-- Content Analytics Table (daily snapshots)
CREATE TABLE IF NOT EXISTS content_analytics (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  captured_at DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, account_name, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_content_analytics_platform ON content_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_content_analytics_captured_at ON content_analytics(captured_at);
CREATE INDEX IF NOT EXISTS idx_content_analytics_account ON content_analytics(account_name);

-- Social Posts Table (for local compose/schedule/publish)
CREATE TABLE IF NOT EXISTS social_posts (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  engagement JSONB DEFAULT '{}',
  external_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_posts(scheduled_at);

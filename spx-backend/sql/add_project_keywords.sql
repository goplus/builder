-- Migration: Add project keywords table for instant search functionality
-- Created: 2025-09-05
-- Description: Creates project_keywords table to store LLM-generated keywords for projects

-- Create project_keywords table
CREATE TABLE IF NOT EXISTS project_keywords (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    keywords JSON NOT NULL DEFAULT '[]',
    theme VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    generation_prompt TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_at TIMESTAMP NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_keywords_project_id ON project_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_project_keywords_status ON project_keywords(status);
CREATE INDEX IF NOT EXISTS idx_project_keywords_theme ON project_keywords(theme);
CREATE INDEX IF NOT EXISTS idx_project_keywords_created_at ON project_keywords(created_at);

-- Add foreign key constraint (assuming projects table exists)
-- ALTER TABLE project_keywords ADD CONSTRAINT fk_project_keywords_project_id 
--     FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Add updated_at trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_project_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_project_keywords_updated_at
    BEFORE UPDATE ON project_keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_project_keywords_updated_at();

-- Create enum type for keyword generation status (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'keyword_status') THEN
        CREATE TYPE keyword_status AS ENUM ('pending', 'generating', 'completed', 'failed');
    END IF;
END
$$;

-- Alter table to use enum type for status column
-- ALTER TABLE project_keywords ALTER COLUMN status TYPE keyword_status USING status::keyword_status;

-- Add comments for documentation
COMMENT ON TABLE project_keywords IS 'Stores LLM-generated keywords for projects to enable instant search functionality';
COMMENT ON COLUMN project_keywords.project_id IS 'Foreign key reference to the associated project';
COMMENT ON COLUMN project_keywords.keywords IS 'JSON array of generated keywords for the project';
COMMENT ON COLUMN project_keywords.theme IS 'Theme style used for keyword generation (e.g., cartoon, realistic, minimal)';
COMMENT ON COLUMN project_keywords.status IS 'Status of keyword generation process (pending, generating, completed, failed)';
COMMENT ON COLUMN project_keywords.generation_prompt IS 'The prompt used to generate these keywords';
COMMENT ON COLUMN project_keywords.generated_at IS 'Timestamp when keywords were successfully generated';

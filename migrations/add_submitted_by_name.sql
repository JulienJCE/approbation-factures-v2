-- Migration: Add submitted_by_name and submitted_by_email columns to documents table
-- Created: 2026-07-29

ALTER TABLE documents 
ADD COLUMN submitted_by_name VARCHAR(255),
ADD COLUMN submitted_by_email VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX idx_documents_submitted_by_email ON documents(submitted_by_email);

-- Optional: Update existing documents with submitted_by_name = 'Unknown' if needed
UPDATE documents 
SET submitted_by_name = 'Unknown' 
WHERE submitted_by_name IS NULL;

-- Create credit_boxes table to store the three boxes (كاش, بنك, عهدة)
CREATE TABLE IF NOT EXISTS credit_boxes (
  id BIGSERIAL PRIMARY KEY,
  box_type TEXT NOT NULL UNIQUE, -- 'كاش', 'بنك', 'عهدة'
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE credit_boxes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations
CREATE POLICY "Allow all operations" ON credit_boxes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert initial values if they don't exist
INSERT INTO credit_boxes (box_type, amount) 
VALUES 
  ('كاش', 0),
  ('بنك', 0),
  ('عهدة', 0)
ON CONFLICT (box_type) DO NOTHING;


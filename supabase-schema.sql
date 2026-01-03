-- Create payments table
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  beneficiary TEXT NOT NULL,
  account TEXT NOT NULL,
  project TEXT NOT NULL,
  description TEXT,
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (optional, for security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations" ON payments
  FOR ALL
  USING (true)
  WITH CHECK (true);


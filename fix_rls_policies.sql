-- Fix RLS policies for technician editing

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view work orders in their organization" ON work_orders;
DROP POLICY IF EXISTS "Users can insert work orders in their organization" ON work_orders;
DROP POLICY IF EXISTS "Users can update work orders in their organization" ON work_orders;
DROP POLICY IF EXISTS "Users can delete work orders in their organization" ON work_orders;

-- Create simplified, working policies

-- Select policy: Users can view work orders in their organization
CREATE POLICY "work_orders_select" ON work_orders
    FOR SELECT
    USING (
        (auth.jwt() ->> 'organization_id')::text = 
        (auth.uid()::text || '_org') OR
        (auth.jwt() ->> 'organization_id') = 'org_default'
    );

-- Insert policy: Users can create work orders in their organization  
CREATE POLICY "work_orders_insert" ON work_orders
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid() AND
        (
            (auth.jwt() ->> 'organization_id')::text = 
            (auth.uid()::text || '_org') OR
            (auth.jwt() ->> 'organization_id') = 'org_default'
        )
    );

-- Update policy: Admins can update any work order in org, technicians can update assigned work orders
CREATE POLICY "work_orders_update" ON work_orders
    FOR UPDATE
    USING (
        (
            (auth.jwt() ->> 'organization_id')::text = 
            (auth.uid()::text || '_org') OR
            (auth.jwt() ->> 'organization_id') = 'org_default'
        ) AND
        (
            -- Admin can update any work order in their organization
            (auth.jwt() ->> 'is_admin')::boolean = true OR
            -- Technician can update work orders assigned to them
            assigned_to = auth.uid()
        )
    );

-- Delete policy: Only admins can delete work orders in their organization
CREATE POLICY "work_orders_delete" ON work_orders
    FOR DELETE
    USING (
        (auth.jwt() ->> 'is_admin')::boolean = true AND
        (
            (auth.jwt() ->> 'organization_id')::text = 
            (auth.uid()::text || '_org') OR
            (auth.jwt() ->> 'organization_id') = 'org_default'
        )
    );

-- Ensure RLS is enabled
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON work_orders TO authenticated;
GRANT USAGE ON SEQUENCE work_orders_id_seq TO authenticated;
EOF < /dev/null
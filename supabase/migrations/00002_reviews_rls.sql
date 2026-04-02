-- Explicit RLS policies for reviews table
-- Deny UPDATE and DELETE by authenticated users (reviews are immutable once submitted)

create policy "Reviews cannot be updated by users"
  on reviews
  for update
  using (false);

create policy "Reviews cannot be deleted by users"
  on reviews
  for delete
  using (false);

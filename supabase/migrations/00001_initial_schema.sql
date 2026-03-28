-- MAE Initial Database Schema
-- Tables: profiles, providers, employees, services, availability, appointments, reviews

-- Enum types
create type user_role as enum ('user', 'provider');
create type appointment_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role user_role not null default 'user',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Providers (businesses that offer services)
create table providers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  business_name text not null,
  description text,
  address text not null,
  city text not null,
  postal_code text not null,
  latitude double precision,
  longitude double precision,
  phone text,
  website text,
  category text not null,
  rating numeric(2,1) not null default 0,
  review_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_providers_city on providers(city);
create index idx_providers_category on providers(category);
create index idx_providers_location on providers(latitude, longitude) where latitude is not null;
create index idx_providers_profile on providers(profile_id);

-- Employees (staff members of a provider)
create table employees (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_employees_provider on employees(provider_id);

-- Services (what a provider offers)
create table services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null,
  price_cents integer not null,
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_services_provider on services(provider_id);
create index idx_services_category on services(category);

-- Availability (recurring weekly schedule)
create table availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Monday, 6=Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint valid_time_range check (start_time < end_time)
);

create index idx_availability_provider on availability(provider_id);
create index idx_availability_employee on availability(employee_id);

-- Appointments
create table appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  service_id uuid not null references services(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status not null default 'pending',
  notes text,
  price_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_appointment_time check (start_time < end_time)
);

create index idx_appointments_user on appointments(user_id);
create index idx_appointments_provider on appointments(provider_id);
create index idx_appointments_employee on appointments(employee_id);
create index idx_appointments_time on appointments(start_time, end_time);
create index idx_appointments_status on appointments(status);

-- Reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade unique,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_reviews_provider on reviews(provider_id);
create index idx_reviews_user on reviews(user_id);

-- Auto-update updated_at timestamps
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger providers_updated_at before update on providers
  for each row execute function update_updated_at();

create trigger appointments_updated_at before update on appointments
  for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Update provider rating when a review is added
create or replace function update_provider_rating()
returns trigger as $$
begin
  update providers
  set
    rating = (select round(avg(rating)::numeric, 1) from reviews where provider_id = new.provider_id),
    review_count = (select count(*) from reviews where provider_id = new.provider_id)
  where id = new.provider_id;
  return new;
end;
$$ language plpgsql;

create trigger reviews_update_rating after insert or update on reviews
  for each row execute function update_provider_rating();

-- Row Level Security
alter table profiles enable row level security;
alter table providers enable row level security;
alter table employees enable row level security;
alter table services enable row level security;
alter table availability enable row level security;
alter table appointments enable row level security;
alter table reviews enable row level security;

-- Profiles: users can read all, update own
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Providers: readable by all, writable by owner
create policy "Providers are viewable by everyone" on providers for select using (is_active = true);
create policy "Provider owners can manage" on providers for all using (profile_id = auth.uid());

-- Employees: readable by all (for booking), writable by provider owner
create policy "Employees viewable when active" on employees for select using (
  is_active = true and exists (select 1 from providers where id = employees.provider_id and is_active = true)
);
create policy "Provider owners can manage employees" on employees for all using (
  exists (select 1 from providers where id = employees.provider_id and profile_id = auth.uid())
);

-- Services: readable by all, writable by provider owner
create policy "Services viewable when active" on services for select using (
  is_active = true and exists (select 1 from providers where id = services.provider_id and is_active = true)
);
create policy "Provider owners can manage services" on services for all using (
  exists (select 1 from providers where id = services.provider_id and profile_id = auth.uid())
);

-- Availability: readable by all, writable by provider owner
create policy "Availability is viewable by everyone" on availability for select using (true);
create policy "Provider owners can manage availability" on availability for all using (
  exists (select 1 from providers where id = availability.provider_id and profile_id = auth.uid())
);

-- Appointments: users see own, providers see theirs
create policy "Users can view own appointments" on appointments for select using (user_id = auth.uid());
create policy "Providers can view their appointments" on appointments for select using (
  exists (select 1 from providers where id = appointments.provider_id and profile_id = auth.uid())
);
create policy "Users can create appointments" on appointments for insert with check (user_id = auth.uid());
create policy "Users can update own appointments" on appointments for update using (user_id = auth.uid());
create policy "Providers can update their appointments" on appointments for update using (
  exists (select 1 from providers where id = appointments.provider_id and profile_id = auth.uid())
);

-- Reviews: readable by all, writable by appointment user
create policy "Reviews are viewable by everyone" on reviews for select using (true);
create policy "Users can create reviews for their appointments" on reviews for insert with check (
  user_id = auth.uid() and exists (
    select 1 from appointments where id = reviews.appointment_id and user_id = auth.uid() and status = 'completed'
  )
);

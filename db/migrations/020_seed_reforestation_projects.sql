-- Migration: seed reforestation projects
-- Adds example reforestation projects if they don't already exist.

BEGIN;

INSERT INTO public.projects (id, name, description, objectives, image_url, country, region, coordinates, area_target, area_unit, trees_target, species, partners, start_date, end_date, estimated_duration, status, progress, created_at)
SELECT gen_random_uuid(),
  'Amazon Restoration Initiative',
  'Large-scale restoration targeting degraded agricultural plots in the Amazon Basin to rebuild native forest structure and protect biodiversity.',
  'Restore 500 ha of degraded land, re-establish native species, create community stewardship programs, and monitor carbon uptake.',
  NULL,
  'Brazil',
  'Amazonas',
  '-3.4653, -62.2159',
  500,
  'hectares',
  67000,
  to_jsonb(ARRAY['Brazil Nut','Mahogany','Cecropia','Euterpe oleracea']::text[]),
  to_jsonb(ARRAY['Green Earth Foundation','Local Community Cooperatives','University of Manaus']::text[]),
  '2024-03-01',
  NULL,
  '5 years',
  'active',
  0,
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE name = 'Amazon Restoration Initiative' AND country = 'Brazil');

-- Add project members (use existing real users) for Amazon Restoration Initiative
INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
SELECT gen_random_uuid(), p.id, v.user_id::uuid, v.role, now()
FROM (SELECT id FROM public.projects WHERE name = 'Amazon Restoration Initiative' AND country = 'Brazil') p
CROSS JOIN (VALUES
  ('1d714e6f-5535-49d4-89f5-d8e84627817d','owner'),
  ('5246c556-4fd9-43bc-bffd-467c5b9cf183','member'),
  ('a2f3feee-4a62-4923-a97d-3a2c0a91c6a4','member')
) AS v(user_id, role)
WHERE NOT EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = v.user_id::uuid);

INSERT INTO public.projects (id, name, description, objectives, image_url, country, region, coordinates, area_target, area_unit, trees_target, species, partners, start_date, end_date, estimated_duration, status, progress, created_at)
SELECT gen_random_uuid(),
  'Sumatra Mangrove Recovery',
  'Restore coastal mangrove belts to protect shoreline, improve fisheries, and sequester carbon in southern Sumatra.',
  'Replant 120 ha of mangroves, reduce coastal erosion, and support sustainable aquaculture livelihoods.',
  NULL,
  'Indonesia',
  'South Sumatra',
  '-2.9761, 104.7754',
  120,
  'hectares',
  180000,
  to_jsonb(ARRAY['Rhizophora mucronata','Avicennia marina']::text[]),
  to_jsonb(ARRAY['Coastal Resilience NGO','Village Fishers Association','Ministry of Marine Affairs']::text[]),
  '2024-07-15',
  NULL,
  '3 years',
  'active',
  0,
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE name = 'Sumatra Mangrove Recovery' AND country = 'Indonesia');

-- Add project members for Sumatra Mangrove Recovery
INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
SELECT gen_random_uuid(), p.id, v.user_id::uuid, v.role, now()
FROM (SELECT id FROM public.projects WHERE name = 'Sumatra Mangrove Recovery' AND country = 'Indonesia') p
CROSS JOIN (VALUES
  ('1d714e6f-5535-49d4-89f5-d8e84627817d','owner'),
  ('5246c556-4fd9-43bc-bffd-467c5b9cf183','member'),
  ('a2f3feee-4a62-4923-a97d-3a2c0a91c6a4','member')
) AS v(user_id, role)
WHERE NOT EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = v.user_id::uuid);

INSERT INTO public.projects (id, name, description, objectives, image_url, country, region, coordinates, area_target, area_unit, trees_target, species, partners, start_date, end_date, estimated_duration, status, progress, created_at)
SELECT gen_random_uuid(),
  'Kenya Community Agroforestry',
  'Support smallholder farmers to integrate agroforestry and fruit tree systems to improve food security and diversify income.',
  'Plant 80 ha of mixed agroforestry systems, train 500 farmers, and monitor crop yields and soil health.',
  NULL,
  'Kenya',
  'Embu County',
  '-0.5361, 37.4600',
  80,
  'hectares',
  120000,
  to_jsonb(ARRAY['Grevillea robusta','Mango','Avocado','Faidherbia albida']::text[]),
  to_jsonb(ARRAY['AgroFuture Kenya','County Agricultural Office','Local Farmer Cooperatives']::text[]),
  '2025-01-10',
  NULL,
  '4 years',
  'active',
  0,
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE name = 'Kenya Community Agroforestry' AND country = 'Kenya');

-- Add project members for Kenya Community Agroforestry
INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
SELECT gen_random_uuid(), p.id, v.user_id::uuid, v.role, now()
FROM (SELECT id FROM public.projects WHERE name = 'Kenya Community Agroforestry' AND country = 'Kenya') p
CROSS JOIN (VALUES
  ('1d714e6f-5535-49d4-89f5-d8e84627817d','owner'),
  ('5246c556-4fd9-43bc-bffd-467c5b9cf183','member'),
  ('a2f3feee-4a62-4923-a97d-3a2c0a91c6a4','member')
) AS v(user_id, role)
WHERE NOT EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = v.user_id::uuid);

INSERT INTO public.projects (id, name, description, objectives, image_url, country, region, coordinates, area_target, area_unit, trees_target, species, partners, start_date, end_date, estimated_duration, status, progress, created_at)
SELECT gen_random_uuid(),
  'San Jose Urban Canopy Project',
  'Increase urban tree canopy to cool neighborhoods, improve air quality, and engage schools in tree stewardship.',
  'Plant 5,000 trees across 20 neighborhoods, partner with schools for maintenance, and measure cooling effects.',
  NULL,
  'Costa Rica',
  'San Jose Metro',
  '9.9281, -84.0907',
  20,
  'hectares',
  5000,
  to_jsonb(ARRAY['Guarumo','Almendro','Ceiba pentandra']::text[]),
  to_jsonb(ARRAY['City of San José','Green Schools Initiative','Urban Forestry Lab']::text[]),
  '2024-09-01',
  NULL,
  '2 years',
  'active',
  0,
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE name = 'San Jose Urban Canopy Project' AND country = 'Costa Rica');

-- Add project members for San Jose Urban Canopy Project
INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
SELECT gen_random_uuid(), p.id, v.user_id::uuid, v.role, now()
FROM (SELECT id FROM public.projects WHERE name = 'San Jose Urban Canopy Project' AND country = 'Costa Rica') p
CROSS JOIN (VALUES
  ('1d714e6f-5535-49d4-89f5-d8e84627817d','owner'),
  ('5246c556-4fd9-43bc-bffd-467c5b9cf183','member'),
  ('a2f3feee-4a62-4923-a97d-3a2c0a91c6a4','member')
) AS v(user_id, role)
WHERE NOT EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = v.user_id::uuid);

INSERT INTO public.projects (id, name, description, objectives, image_url, country, region, coordinates, area_target, area_unit, trees_target, species, partners, start_date, end_date, estimated_duration, status, progress, created_at)
SELECT gen_random_uuid(),
  'Andes Highland Reforestation',
  'Restore highland forest corridors to reconnect fragmented habitats and secure water sources for downstream communities.',
  'Restore 300 ha of montane forest, plant native Polylepis and other high-elevation species, and improve watershed health.',
  NULL,
  'Peru',
  'Cusco Highlands',
  '-13.5320, -71.9675',
  300,
  'hectares',
  45000,
  to_jsonb(ARRAY['Polylepis','Alnus acuminata','Weinmannia trichosperma']::text[]),
  to_jsonb(ARRAY['Andean Conservation Alliance','Local Water Users Association','Regional Government of Cusco']::text[]),
  '2024-05-20',
  NULL,
  '6 years',
  'active',
  0,
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE name = 'Andes Highland Reforestation' AND country = 'Peru');

-- Add project members for Andes Highland Reforestation
INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
SELECT gen_random_uuid(), p.id, v.user_id::uuid, v.role, now()
FROM (SELECT id FROM public.projects WHERE name = 'Andes Highland Reforestation' AND country = 'Peru') p
CROSS JOIN (VALUES
  ('1d714e6f-5535-49d4-89f5-d8e84627817d','owner'),
  ('5246c556-4fd9-43bc-bffd-467c5b9cf183','member'),
  ('a2f3feee-4a62-4923-a97d-3a2c0a91c6a4','member')
) AS v(user_id, role)
WHERE NOT EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = v.user_id::uuid);

COMMIT;

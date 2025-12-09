/*
Seed script for reforestation projects.
Usage:
  node scripts/seed-reforestation.mjs

It will POST to the API at `API_URL` (defaults to http://localhost:3000).
Make sure your dev server is running and accepting POST /api/projects.
*/

const API_URL = process.env.API_URL || 'http://localhost:3000';
const endpoint = `${API_URL}/api/projects`;

const projects = [
  {
    name: 'Amazon Restoration Initiative',
    description: 'Large-scale restoration targeting degraded agricultural plots in the Amazon Basin to rebuild native forest structure and protect biodiversity.',
    objectives: 'Restore 500 ha of degraded land, re-establish 8 native species, create community stewardship programs, and monitor carbon uptake.',
    image_url: null,
    country: 'Brazil',
    region: 'Amazonas',
    coordinates: '-3.4653, -62.2159',
    area_target: 500,
    area_unit: 'hectares',
    trees_target: 67000,
    species: ['Brazil Nut', 'Mahogany', 'Cecropia', 'Euterpe oleracea'],
    partners: ['Green Earth Foundation', 'Local Community Cooperatives', 'University of Manaus'],
    start_date: '2024-03-01',
    end_date: null,
    estimated_duration: '5 years'
  },

  {
    name: 'Sumatra Mangrove Recovery',
    description: 'Restore coastal mangrove belts to protect shoreline, improve fisheries, and sequester carbon in southern Sumatra.',
    objectives: 'Replant 120 ha of mangroves, reduce coastal erosion, and support sustainable aquaculture livelihoods.',
    image_url: null,
    country: 'Indonesia',
    region: 'South Sumatra',
    coordinates: '-2.9761, 104.7754',
    area_target: 120,
    area_unit: 'hectares',
    trees_target: 180000,
    species: ['Rhizophora mucronata', 'Avicennia marina'],
    partners: ['Coastal Resilience NGO', 'Village Fishers Association', 'Ministry of Marine Affairs'],
    start_date: '2024-07-15',
    end_date: null,
    estimated_duration: '3 years'
  },

  {
    name: 'Kenya Community Agroforestry',
    description: 'Support smallholder farmers to integrate agroforestry and fruit tree systems to improve food security and diversify income.',
    objectives: 'Plant 80 ha of mixed agroforestry systems, train 500 farmers, and monitor crop yields and soil health.',
    image_url: null,
    country: 'Kenya',
    region: 'Embu County',
    coordinates: '-0.5361, 37.4600',
    area_target: 80,
    area_unit: 'hectares',
    trees_target: 120000,
    species: ['Grevillea robusta', 'Mango', 'Avocado', 'Faidherbia albida'],
    partners: ['AgroFuture Kenya', 'County Agricultural Office', 'Local Farmer Cooperatives'],
    start_date: '2025-01-10',
    end_date: null,
    estimated_duration: '4 years'
  },

  {
    name: 'San Jose Urban Canopy Project',
    description: 'Increase urban tree canopy to cool neighborhoods, improve air quality, and engage schools in tree stewardship.',
    objectives: 'Plant 5,000 trees across 20 neighborhoods, partner with schools for maintenance, and measure cooling effects.',
    image_url: null,
    country: 'Costa Rica',
    region: 'San Jose Metro',
    coordinates: '9.9281, -84.0907',
    area_target: 20,
    area_unit: 'hectares',
    trees_target: 5000,
    species: ['Guarumo', 'Almendro', 'Ceiba pentandra'],
    partners: ['City of San José', 'Green Schools Initiative', 'Urban Forestry Lab'],
    start_date: '2024-09-01',
    end_date: null,
    estimated_duration: '2 years'
  },

  {
    name: 'Andes Highland Reforestation',
    description: 'Restore highland forest corridors to reconnect fragmented habitats and secure water sources for downstream communities.',
    objectives: 'Restore 300 ha of montane forest, plant native Polylepis and other high-elevation species, and improve watershed health.',
    image_url: null,
    country: 'Peru',
    region: 'Cusco Highlands',
    coordinates: '-13.5320, -71.9675',
    area_target: 300,
    area_unit: 'hectares',
    trees_target: 45000,
    species: ['Polylepis', 'Alnus acuminata', 'Weinmannia trichosperma'],
    partners: ['Andean Conservation Alliance', 'Local Water Users Association', 'Regional Government of Cusco'],
    start_date: '2024-05-20',
    end_date: null,
    estimated_duration: '6 years'
  }
];

async function seed() {
  for (const p of projects) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('Failed to create project', json);
      } else {
        console.log('Created project:', json.project?.id || json.project || json);
      }
    } catch (err) {
      console.error('Network error creating project', err);
    }
  }
}

seed();

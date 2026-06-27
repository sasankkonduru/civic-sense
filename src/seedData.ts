import { FirestoreIssue } from "./types";

// Helper to generate a random date in the last 30 days
const getRandomDateInLast30Days = (daysAgoStart: number, daysAgoEnd: number): string => {
  const minDays = Math.min(daysAgoStart, daysAgoEnd);
  const maxDays = Math.max(daysAgoStart, daysAgoEnd);
  const daysAgo = minDays + Math.random() * (maxDays - minDays);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  // Also randomize hours/minutes
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date.toISOString();
};

export const SEEDED_ISSUES_RAW = [
  // HYDERABAD (17.3850, 78.4867)
  {
    title: "Severe Pothole on Jubilee Hills Road No. 36",
    description: "Large, deep pothole at the turn on Road No. 36 near metro pillar 1620. Vehicles swerve abruptly to avoid it, creating extreme collision risk.",
    category: "Pothole",
    severity: "Critical",
    status: "Reported",
    priority: 1,
    priorityScore: 92,
    priorityLevel: "Critical",
    priorityReasoning: "Critical severity pothole on highly active transit corridor (Jubilee Hills Rd 36) posing immediate vehicle collision hazard.",
    location: "Road No. 36, Jubilee Hills, Hyderabad, Telangana",
    latitude: 17.4325,
    longitude: 78.4071,
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-hyderabad-1",
    reporterName: "Sasank Konduru",
    reporterEmail: "sasankkonduru@gmail.com",
    aiAnalysis: {
      category: "Pothole",
      severity: "Critical",
      priority: 1,
      explanation: "Large pothole in primary traffic lane of critical metropolitan arterial road. Extreme safety concern for two-wheelers.",
      recommendedAction: "Dispatch emergency hot-mix asphalt patch unit to seal the cavity and stabilize the road surface.",
      estimatedCost: "$350 - $600"
    }
  },
  {
    title: "Overflowing Garbage Dump near Gachibowli DLF Phase 1",
    description: "A huge pile of commercial and wet food waste has accumulated outside the designated collection bin. Stray dogs are scattering it across the footpath.",
    category: "Garbage",
    severity: "High",
    status: "Under Review",
    priority: 2,
    priorityScore: 78,
    priorityLevel: "High",
    priorityReasoning: "High volume of unsanitary commercial food waste accumulating on active pedestrian footway, creating local health hazards.",
    location: "DLF Cyber City Road, Gachibowli, Hyderabad, Telangana",
    latitude: 17.4441,
    longitude: 78.3489,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-hyderabad-2",
    reporterName: "Ananya Reddy",
    reporterEmail: "ananya.r@example.com",
    aiAnalysis: {
      category: "Garbage",
      severity: "High",
      priority: 2,
      explanation: "Commercial waste pile overflowing onto public footpaths in high-density corporate hub, attracting pests.",
      recommendedAction: "Deploy heavy sanitation waste extraction compactors and sanitize the footpath using eco-friendly spray.",
      estimatedCost: "$150 - $300"
    }
  },
  {
    title: "Major Water Line Leakage in Begumpet",
    description: "Main underground drinking water pipe has ruptured, shooting a continuous flow of water onto the main road. The area is waterlogged.",
    category: "Water Leakage",
    severity: "Critical",
    status: "In Progress",
    priority: 1,
    priorityScore: 94,
    priorityLevel: "Critical",
    priorityReasoning: "Substantial drinking water main pipe rupture causing local flooding and utility loss in high-density Begumpet sector.",
    location: "Begumpet Main Road, near Metro Station, Hyderabad, Telangana",
    latitude: 17.4448,
    longitude: 78.4602,
    imageUrl: "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-hyderabad-3",
    reporterName: "Ramesh Kumar",
    reporterEmail: "ramesh.k@example.com",
    aiAnalysis: {
      category: "Water Leakage",
      severity: "Critical",
      priority: 1,
      explanation: "Freshwater supply line failure. High volume losses and waterlogging on prime transit arterial.",
      recommendedAction: "Shut off sector isolation valve B-12 immediately. Deploy heavy earth excavation and pipe-welding response crew.",
      estimatedCost: "$1,800 - $3,500"
    }
  },

  // BENGALURU (12.9716, 77.5946)
  {
    title: "Damaged Pavement Slabs in Indiranagar",
    description: "Several high-density concrete pavement slabs have collapsed or broken near the metro line pathway. Severe risk of trip and falls, especially for seniors.",
    category: "Road Damage",
    severity: "Medium",
    status: "Assigned",
    priority: 3,
    priorityScore: 56,
    priorityLevel: "Medium",
    priorityReasoning: "Structural sidewalk degradation in high-pedestrian commercial district, representing moderate public liability.",
    location: "100 Feet Road, Indiranagar, Bengaluru, Karnataka",
    latitude: 12.9716,
    longitude: 77.6412,
    imageUrl: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-bengaluru-1",
    reporterName: "Vikram Sen",
    reporterEmail: "vikram.s@example.com",
    aiAnalysis: {
      category: "Road Damage",
      severity: "Medium",
      priority: 3,
      explanation: "Broken walking pavers on high-footfall Indiranagar sidewalk corridor. Trip risk.",
      recommendedAction: "Schedule masonry crew to extract shattered concrete panels, level base gravel, and install heavy-duty precast slabs.",
      estimatedCost: "$400 - $800"
    }
  },
  {
    title: "Broken High-Mast Streetlight on Koramangala 80 Feet Rd",
    description: "The main high-mast light at the busy crosswalk is dead. The entire intersection is pitch black at night, causing high risk of pedestrian hit-and-runs.",
    category: "Broken Streetlight",
    severity: "High",
    status: "Resolved",
    priority: 2,
    priorityScore: 72,
    priorityLevel: "High",
    priorityReasoning: "Total dark-out of major intersection high-mast streetlight, drastically elevating nighttime pedestrian and traffic accidents.",
    location: "80 Feet Road, Koramangala 4th Block, Bengaluru, Karnataka",
    latitude: 12.9279,
    longitude: 77.6271,
    imageUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-bengaluru-2",
    reporterName: "Priyanka Das",
    reporterEmail: "priyanka.d@example.com",
    aiAnalysis: {
      category: "Broken Streetlight",
      severity: "High",
      priority: 2,
      explanation: "High-voltage luminaire failure at highly active residential and retail junction. Increases security risks.",
      recommendedAction: "Deploy bucket truck crew to replace the faulty mercury vapor ballast with modern energy-efficient LED luminaire.",
      estimatedCost: "$250 - $450"
    }
  },
  {
    title: "Clogged Stormwater Drain Flooding Whitefield Main Rd",
    description: "Severe blockages in the roadside storm drains are causing significant water accumulation. Puddles of smelly black water are flooding the lanes.",
    category: "Water Leakage",
    severity: "High",
    status: "Verified & Closed",
    priority: 2,
    priorityScore: 75,
    priorityLevel: "High",
    priorityReasoning: "Severe stormwater runoff blockage flooding vehicular lanes, causing major rush-hour traffic gridlocks in Whitefield.",
    location: "Whitefield Main Road, near ITPL, Bengaluru, Karnataka",
    latitude: 12.9698,
    longitude: 77.7499,
    imageUrl: "https://images.unsplash.com/photo-1542013936693-8848e574047a?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-bengaluru-3",
    reporterName: "Siddharth Nair",
    reporterEmail: "siddharth.n@example.com",
    aiAnalysis: {
      category: "Water Leakage",
      severity: "High",
      priority: 2,
      explanation: "Blocked storm drainage grid causing street ponding. Corrodes asphalt base and creates severe traffic slow-downs.",
      recommendedAction: "Dispatch high-pressure water jetting truck to clear plastic debris and silt from catch basins and outlet culverts.",
      estimatedCost: "$300 - $600"
    }
  },

  // CHENNAI (13.0827, 80.2707)
  {
    title: "Damaged Road Boundary Grill on Anna Salai",
    description: "The metal divider fence between opposing lanes is crushed and bent onto the road, likely from a previous vehicle collision. Spikes are exposed.",
    category: "Road Damage",
    severity: "High",
    status: "Reported",
    priority: 2,
    priorityScore: 76,
    priorityLevel: "High",
    priorityReasoning: "Bent lane divider steel protruding into oncoming high-speed traffic lanes, presenting extreme tire tear and crash hazard.",
    location: "Anna Salai, Near Spencer Plaza, Chennai, Tamil Nadu",
    latitude: 13.0604,
    longitude: 80.2504,
    imageUrl: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-chennai-1",
    reporterName: "Meena Swaminathan",
    reporterEmail: "meena.s@example.com",
    aiAnalysis: {
      category: "Road Damage",
      severity: "High",
      priority: 2,
      explanation: "Mechanical impact damage to heavy-gauge steel median barrier. Metal shards encroaching on lane space.",
      recommendedAction: "Send civil crew with welding equipment and replacement barrier rails to extract damaged posts and weld new dividers.",
      estimatedCost: "$500 - $950"
    }
  },
  {
    title: "Leaking Sewage Valve in Mylapore",
    description: "An underground sanitary sewer line valve is leaking sewer water, producing foul odors and causing unhygienic conditions near the local temple.",
    category: "Water Leakage",
    severity: "High",
    status: "Under Review",
    priority: 2,
    priorityScore: 82,
    priorityLevel: "High",
    priorityReasoning: "Foul sewage spill on active cultural footway, presenting substantial environmental hygiene and pathogenic risks.",
    location: "Kapaleeshwarar Temple West Mada St, Mylapore, Chennai, Tamil Nadu",
    latitude: 13.0418,
    longitude: 80.2677,
    imageUrl: "https://images.unsplash.com/photo-1542013936693-8848e574047a?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-chennai-2",
    reporterName: "Karthik Raja",
    reporterEmail: "karthik.r@example.com",
    aiAnalysis: {
      category: "Water Leakage",
      severity: "High",
      priority: 2,
      explanation: "Pressurized sewer discharge from valve chamber near high-footfall historical/religious site. Serious public health nuisance.",
      recommendedAction: "Deploy sanitation vacuum truck to clear sewage pool, replace failed valve gasket, and apply chlorine disinfectant.",
      estimatedCost: "$600 - $1,200"
    }
  },

  // MUMBAI (19.0760, 72.8777)
  {
    title: "Deep Pothole Crater on Bandra Linking Road",
    description: "Multiple vehicles have suffered tire damage from a massive crater-like pothole. It is invisible during rain as it fills up with muddy water.",
    category: "Pothole",
    severity: "Critical",
    status: "In Progress",
    priority: 1,
    priorityScore: 90,
    priorityLevel: "Critical",
    priorityReasoning: "Deep crater-style pothole on high-speed Bandra corridor, invisible during monsoons, causing severe vehicular damage.",
    location: "Linking Road, Bandra West, Mumbai, Maharashtra",
    latitude: 19.0596,
    longitude: 72.8295,
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-mumbai-1",
    reporterName: "Farhan Khan",
    reporterEmail: "farhan.k@example.com",
    aiAnalysis: {
      category: "Pothole",
      severity: "Critical",
      priority: 1,
      explanation: "Substantial asphalt structural failure in heavy-volume coastal transit area. Water retention masks hazard.",
      recommendedAction: "Excavate loose pavement, apply rapid-set cationic asphalt emulsion, compress with heavy roller, and seal joints.",
      estimatedCost: "$300 - $550"
    }
  },
  {
    title: "Overflowing Garbage and Construction Debris in Andheri",
    description: "Solid waste and concrete rubble have been dumped directly onto the public sidewalk. It has blocked the entrance to the housing society.",
    category: "Garbage",
    severity: "Medium",
    status: "Assigned",
    priority: 3,
    priorityScore: 64,
    priorityLevel: "Medium",
    priorityReasoning: "Illegal construction and domestic debris blockage restricting housing entrance and walking pathways.",
    location: "Andheri Kurla Road, near Metro Station, Mumbai, Maharashtra",
    latitude: 19.1136,
    longitude: 72.8697,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-mumbai-2",
    reporterName: "Meera Patel",
    reporterEmail: "meera.p@example.com",
    aiAnalysis: {
      category: "Garbage",
      severity: "Medium",
      priority: 3,
      explanation: "Illegal dumping of residential solid waste combined with demolition aggregate on municipal right-of-way.",
      recommendedAction: "Dispatch solid-waste dump truck equipped with claw lift to extract aggregate and clear public footway.",
      estimatedCost: "$200 - $450"
    }
  },
  {
    title: "Flickering and Dim Streetlights in Colaba Residential Lane",
    description: "The entire block has very dim, yellow-orange lighting with two streetlights actively flickering. Creates unsafe dark spots.",
    category: "Broken Streetlight",
    severity: "Low",
    status: "Resolved",
    priority: 4,
    priorityScore: 38,
    priorityLevel: "Low",
    priorityReasoning: "Non-critical light degradation in low-speed residential cul-de-sac. Low public safety threat, aesthetic concern.",
    location: "Arthur Bunder Road, Colaba, Mumbai, Maharashtra",
    latitude: 18.9220,
    longitude: 72.8347,
    imageUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-mumbai-3",
    reporterName: "Rohan Dsouza",
    reporterEmail: "rohan.d@example.com",
    aiAnalysis: {
      category: "Broken Streetlight",
      severity: "Low",
      priority: 4,
      explanation: "Aging high-pressure sodium luminaires with degrading starter capacitor. Cosmetic/minor visibility issue.",
      recommendedAction: "Schedule light crew during weekly route to swap out bulbs and ignitors with energy-saving components.",
      estimatedCost: "$100 - $180"
    }
  },

  // DELHI (28.6139, 77.2090)
  {
    title: "Open Manhole Chamber in Connaught Place",
    description: "An open manhole chamber with broken concrete slabs on the busy outer circle pedestrian pathway. Active falling hazard for walkers.",
    category: "Road Damage",
    severity: "Critical",
    status: "Reported",
    priority: 1,
    priorityScore: 96,
    priorityLevel: "Critical",
    priorityReasoning: "Open sewer/utility manhole shaft on premier pedestrian walking path, creating severe fatal falling hazard.",
    location: "Connaught Place Outer Circle, New Delhi, Delhi",
    latitude: 28.6304,
    longitude: 77.2177,
    imageUrl: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-delhi-1",
    reporterName: "Vikram Malhotra",
    reporterEmail: "vikram.m@example.com",
    aiAnalysis: {
      category: "Road Damage",
      severity: "Critical",
      priority: 1,
      explanation: "Exposed utility shaft in high-density shopping precinct. Extreme public safety liability.",
      recommendedAction: "Erect structural safety barricades immediately. Dispatch civil maintenance team to cast new steel-reinforced concrete manhole cover.",
      estimatedCost: "$350 - $700"
    }
  },
  {
    title: "Damaged Main Sewer Line Leak in Karol Bagh",
    description: "A foul-smelling stream of dark gray water is flooding the commercial lane, forcing shoppers to walk on the busy vehicular road.",
    category: "Water Leakage",
    severity: "High",
    status: "Under Review",
    priority: 2,
    priorityScore: 84,
    priorityLevel: "High",
    priorityReasoning: "Raw sewage leak on premium retail shopping corridor in Karol Bagh, presenting immense public health concerns.",
    location: "Ajmal Khan Road, Karol Bagh, New Delhi, Delhi",
    latitude: 28.6441,
    longitude: 77.1891,
    imageUrl: "https://images.unsplash.com/photo-1542013936693-8848e574047a?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-delhi-2",
    reporterName: "Rajeev Gupta",
    reporterEmail: "rajeev.g@example.com",
    aiAnalysis: {
      category: "Water Leakage",
      severity: "High",
      priority: 2,
      explanation: "Active sewer main failure, leaking untreated waste water. Creates traffic congestion and bio-contamination.",
      recommendedAction: "Authorize emergency sewer bypass pumping. Deploy trenchless pipe-liner patch team to seal internal pipe rupture.",
      estimatedCost: "$1,200 - $2,500"
    }
  },
  {
    title: "Pothole Congestion near Dwarka Sector 10",
    description: "A cluster of 4 deep potholes in close proximity on the sector connector road, forcing slow driving and creating a major bottle-neck.",
    category: "Pothole",
    severity: "Medium",
    status: "In Progress",
    priority: 3,
    priorityScore: 62,
    priorityLevel: "Medium",
    priorityReasoning: "Pothole cluster causing localized traffic delays and sudden vehicle braking on active connector route.",
    location: "Sector 10 Road, Dwarka, New Delhi, Delhi",
    latitude: 28.5921,
    longitude: 77.0460,
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-delhi-3",
    reporterName: "Sunita Sharma",
    reporterEmail: "sunita.s@example.com",
    aiAnalysis: {
      category: "Pothole",
      severity: "Medium",
      priority: 3,
      explanation: "Surface alligator cracking evolved into multiple adjacent potholes. Commuters forced to make sharp corrective maneuvers.",
      recommendedAction: "Schedule infrared asphalt heater and patcher truck to heat and re-lay potholed sector in single shift.",
      estimatedCost: "$450 - $900"
    }
  },

  // PUNE (18.5204, 73.8567)
  {
    title: "Malfunctioning Traffic and Pedestrian Signals at Swargate Junction",
    description: "The primary traffic lights at the busy Swargate intersection are completely dead, leading to heavy gridlock and active safety hazards for commuters.",
    category: "Broken Streetlight",
    severity: "Critical",
    status: "Assigned",
    priority: 1,
    priorityScore: 95,
    priorityLevel: "Critical",
    priorityReasoning: "Dead traffic signals at a hyper-congested Pune transit hub, creating catastrophic collision risks and traffic gridlock.",
    location: "Swargate Junction, Pune, Maharashtra",
    latitude: 18.5018,
    longitude: 73.8636,
    imageUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-pune-1",
    reporterName: "Amit Joshi",
    reporterEmail: "amit.j@example.com",
    aiAnalysis: {
      category: "Broken Streetlight",
      severity: "Critical",
      priority: 1,
      explanation: "Power supply board failure at major transport terminal junction. Manual traffic control required.",
      recommendedAction: "Alert local traffic police for immediate manual routing. Deploy emergency traffic signaling technician to replace the blown control cabinet board.",
      estimatedCost: "$800 - $1,500"
    }
  },
  {
    title: "Large Garbage Dump in Kothrud Residential Block",
    description: "A huge, unmonitored garbage pile has developed on an empty residential plot. Plastic waste and compostable items are rotting in the sun.",
    category: "Garbage",
    severity: "Medium",
    status: "Resolved",
    priority: 3,
    priorityScore: 54,
    priorityLevel: "Medium",
    priorityReasoning: "Accumulating solid waste pile on vacant block in dense residential sector, causing bad smells and pest issues.",
    location: "Paud Road, Kothrud, Pune, Maharashtra",
    latitude: 18.5074,
    longitude: 73.8077,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-pune-2",
    reporterName: "Pooja Deshpande",
    reporterEmail: "pooja.d@example.com",
    aiAnalysis: {
      category: "Garbage",
      severity: "Medium",
      priority: 3,
      explanation: "Unauthorized solid municipal waste disposal on non-designated lot. Local odor emissions.",
      recommendedAction: "Deploy wheel loader and garbage truck to lift trash. Put up prominent 'No Littering' fine signs.",
      estimatedCost: "$150 - $280"
    }
  },
  {
    title: "Fallen Tree and Road Damage in Koregaon Park",
    description: "A large banyan tree branch fell during heavy winds, cracking the side curb and asphalt. The branch has been pushed aside but pavement is severely fractured.",
    category: "Road Damage",
    severity: "Medium",
    status: "Verified & Closed",
    priority: 3,
    priorityScore: 58,
    priorityLevel: "Medium",
    priorityReasoning: "Severe physical curb fracture and side asphalt crushing by heavy tree fall. Lane boundary partially impacted.",
    location: "Lane 5, Koregaon Park, Pune, Maharashtra",
    latitude: 18.5362,
    longitude: 73.8930,
    imageUrl: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-pune-3",
    reporterName: "Nikhil Kulkarni",
    reporterEmail: "nikhil.k@example.com",
    aiAnalysis: {
      category: "Road Damage",
      severity: "Medium",
      priority: 3,
      explanation: "Mechanical impact damage to precast concrete curbs and local road boundary. Obstruction has been cleared, but structural damage remains.",
      recommendedAction: "Schedule municipal concrete crew to replace broken curb sections and pour cold asphalt mix to seal the surface fracture.",
      estimatedCost: "$300 - $650"
    }
  },

  // KOLKATA (22.5726, 88.3639)
  {
    title: "Water Main Pipe Burst on Park Street",
    description: "A major water connection pipeline has burst beneath the road, causing mud and water to bubble up. The road surface has shifted slightly.",
    category: "Water Leakage",
    severity: "Critical",
    status: "Reported",
    priority: 1,
    priorityScore: 93,
    priorityLevel: "Critical",
    priorityReasoning: "Under-pavement pressurized pipeline burst, causing street washouts and active sinkhole formation risks under Park Street.",
    location: "Park Street, Near Chowringhee Crossing, Kolkata, West Bengal",
    latitude: 22.5532,
    longitude: 88.3516,
    imageUrl: "https://images.unsplash.com/photo-1542013936693-8848e574047a?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-kolkata-1",
    reporterName: "Sourav Mukherjee",
    reporterEmail: "sourav.m@example.com",
    aiAnalysis: {
      category: "Water Leakage",
      severity: "Critical",
      priority: 1,
      explanation: "Major cast-iron main pipeline failure. Potential structural pavement compromise from sub-base erosion.",
      recommendedAction: "Enact immediate street closure. Excavate asphalt base, bypass pressurized supply, replace cracked cast-iron segment, backfill with sand, and lay new asphalt.",
      estimatedCost: "$2,500 - $4,800"
    }
  },
  {
    title: "Litter Pile and Overflowing Bins at Salt Lake Block EE",
    description: "Domestic and commercial garbage bags are piled up on the pavement outside Block EE. Stray animals are rummaging through the plastic bags.",
    category: "Garbage",
    severity: "Medium",
    status: "Under Review",
    priority: 3,
    priorityScore: 50,
    priorityLevel: "Medium",
    priorityReasoning: "Domestic trash bags accumulated on suburban neighborhood sidewalk, attracting stray animals and blocking the pedestrian walk.",
    location: "EE Block, Sector 2, Salt Lake, Kolkata, West Bengal",
    latitude: 22.5804,
    longitude: 88.4179,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-kolkata-2",
    reporterName: "Rituparna Roy",
    reporterEmail: "rituparna.r@example.com",
    aiAnalysis: {
      category: "Garbage",
      severity: "Medium",
      priority: 3,
      explanation: "Litter piling due to missed collection cycle. Moderate sanitary and aesthetic issues.",
      recommendedAction: "Send neighborhood trash collection truck to empty collection bin and clean surrounding surface.",
      estimatedCost: "$100 - $200"
    }
  },
  {
    title: "Extensive Road surface cracking and Potholes on Howrah Bridge Connector",
    description: "Deep cracks and potholes have developed along the approach road, causing heavy vehicles to slow down significantly, leading to extreme tailbacks.",
    category: "Road Damage",
    severity: "High",
    status: "Resolved",
    priority: 2,
    priorityScore: 80,
    priorityLevel: "High",
    priorityReasoning: "Pavement fatigue on critical bridge connector, triggering severe transit delays for thousands of daily vehicles.",
    location: "Howrah Bridge Approach Road, Kolkata, West Bengal",
    latitude: 22.5851,
    longitude: 88.3392,
    imageUrl: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600",
    createdBy: "system-demo-kolkata-3",
    reporterName: "Sanjay Banerjee",
    reporterEmail: "sanjay.b@example.com",
    aiAnalysis: {
      category: "Road Damage",
      severity: "High",
      priority: 2,
      explanation: "Heavy heavy-vehicle dynamic stress causing alligator pavement fatigue and localized base failure.",
      recommendedAction: "Perform overnight cold milling of cracked top layer and overlay with polymer-modified asphalt concrete.",
      estimatedCost: "$1,200 - $3,000"
    }
  }
];

export const getSeededIssues = (): FirestoreIssue[] => {
  // We have exactly 20 items above. Let's make sure we map them and assign realistic timestamps over the previous 30 days.
  return SEEDED_ISSUES_RAW.map((iss, index) => {
    // Generate dates: some old, some very fresh. Let's distribute them over 1 to 29 days ago.
    // Index 0 to 5: 1 to 5 days ago (New, Reported, In Progress)
    // Index 6 to 11: 6 to 15 days ago (Assigned, Under Review)
    // Index 12 to 19: 16 to 29 days ago (Resolved, Verified & Closed)
    let daysAgoStart = 1;
    let daysAgoEnd = 5;
    if (index >= 6 && index <= 11) {
      daysAgoStart = 6;
      daysAgoEnd = 15;
    } else if (index >= 12) {
      daysAgoStart = 16;
      daysAgoEnd = 29;
    }
    
    const createdAt = getRandomDateInLast30Days(daysAgoStart, daysAgoEnd);
    
    return {
      ...iss,
      id: `seed-issue-${index + 1}`,
      createdAt
    } as FirestoreIssue;
  });
};

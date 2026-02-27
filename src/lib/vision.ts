/**
 * AI Vision Configuration and Prompt Engineering Logic
 * Ported from IdealCity to CivicSense.
 */

export const BACKGROUNDS: Record<string, any> = {
    business: {
        base: 'dense urban commercial streetscape: multi-storey shophouses, glass-facade office towers, and wide asphalt roads with crisp white lane markings',
        ground: 'smooth dark-grey tarmac pavement with yellow kerb markings and pedestrian crossing stripes',
        sky: 'solid deep-charcoal void #1a1a1a — no sky, no clouds, no horizon',
        accent: 'warm amber street-lamp glow lining both sides of the road',
    },
    civic: {
        base: 'formal civic precinct: symmetrical tree-lined avenues, manicured lawns, national flagpoles, and low-rise government blocks in the far background',
        ground: 'smooth light-grey concrete plaza with granite inlay strips and tactile guidance paths',
        sky: 'solid deep-charcoal void #1a1a1a — no sky',
        accent: 'cool white institutional floodlighting giving a clean authoritative feel',
    },
    nature: {
        base: 'dense tropical rainforest backdrop: towering rain-trees, thick leaf canopy, uneven terrain covered in lush ferns and ground-cover plants, a winding dirt path cutting through',
        ground: 'natural earth floor with grass patches, exposed tree roots, scattered leaf litter, and patches of moss',
        sky: 'solid deep-forest-green void #0d1a0d — no sky',
        accent: 'soft dappled natural light filtering through the leaf canopy from above',
    },
    transit: {
        base: 'busy multi-lane road interchange: elevated expressways overhead, directional signage gantries, dedicated bus lanes, and taxi bays at ground level',
        ground: 'dark asphalt with bright white and yellow traffic markings, tactile paving strips at kerbs, and bus-stop yellow boxes',
        sky: 'solid deep-charcoal void #1a1a1a — no sky',
        accent: 'bright overhead LED canopy lighting and blue wayfinding signage',
    },
    residential: {
        base: 'quiet residential neighbourhood: low-rise terrace houses, garden fences, tree-shaded footpaths, and a cul-de-sac or local road with speed bumps',
        ground: 'grey concrete pavement with grass verge strips and small garden beds at kerb edge',
        sky: 'solid deep-charcoal void #1a1a1a — no sky',
        accent: 'warm residential street-lamp glow at medium height',
    },
    sports: {
        base: 'large open sports ground: adjacent running track with lane markings, tall floodlight towers at corners, and simple spectator stands visible in the far background',
        ground: 'flat emerald-green synthetic turf or rubberised red athletics track surface with crisp white painted markings',
        sky: 'solid deep-charcoal void #1a1a1a — no sky',
        accent: 'intense white floodlighting from tall poles casting almost no shadows on the playing surface',
    },
    parking: {
        base: 'structured car park: concrete deck levels visible at the rear, access ramp, ticketing booth at entry, and a barrier arm',
        ground: 'grey tarmac with crisp white bay-number stencils and directional arrows on every aisle',
        sky: 'solid deep-charcoal void #1a1a1a — no sky',
        accent: 'flat cool-white fluorescent ceiling lighting across each deck level',
    },
    default: {
        base: 'generic urban environment with mixed-use buildings and a standard road grid',
        ground: 'grey asphalt with white lane markings',
        sky: 'solid deep-charcoal void #1a1a1a — no sky',
        accent: 'neutral white artificial overhead lighting',
    },
};

export const PLACE_TYPE_SCENE_MAP: Record<string, any> = {
    // 🏢 Business & Services
    restaurant: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Restaurant', label: 'Restaurant', environment: 'modern restaurant with welcoming facade, outdoor dining terrace, and warm interior lighting visible through glass', visualStyle: '45-degree isometric showing entrance and terrace', surroundings: 'street-level retail strip, adjacent cafes, pedestrian pavement' },
    cafe: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Café', label: 'Café', environment: 'cosy café with glass shopfront, outdoor tables with umbrellas, and visible barista counter', visualStyle: '45-degree isometric shopfront view', surroundings: 'pedestrian zone, tree-lined street, neighbouring boutiques' },
    bar: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Bar', label: 'Bar', environment: 'trendy bar with neon-lit facade and outdoor terrace', visualStyle: '45-degree isometric', surroundings: 'entertainment district, neighbouring venues, street' },
    bakery: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Bakery', label: 'Bakery', environment: 'charming bakery with warm-toned facade and display window showing bread and pastries', visualStyle: '45-degree isometric shopfront view', surroundings: 'retail street, neighbouring cafes' },
    food_court: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Food Court', label: 'Food Court', environment: 'large open-plan food court hall with stall partitions and communal seating', visualStyle: 'overhead isometric showing stall layout', surroundings: 'shopping centre or transit hub, covered walkways' },
    bank: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Bank', label: 'Bank', environment: 'formal bank building with strong institutional facade, ATM lobby, and corporate signage', visualStyle: '45-degree isometric showing corporate facade', surroundings: 'central business district, pavement, neighbouring offices' },
    pharmacy: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Pharmacy', label: 'Pharmacy', environment: 'retail pharmacy with prominent green-cross sign, bright interior, and neat shelving', visualStyle: '45-degree isometric storefront view', surroundings: 'commercial strip, adjacent shops, pedestrian pavement' },
    hospital: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Hospital', label: 'Hospital', environment: 'large hospital with emergency entrance, multi-wing layout, helipad on roof, and clinical white facades', visualStyle: 'elevated isometric showing full H or L-shaped footprint', surroundings: 'ambulance bays, car parks, green buffer zones' },
    doctor: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Clinic', label: 'Medical Clinic', environment: 'modern medical clinic with clean white facade and patient waiting area visible through glass', visualStyle: '45-degree isometric showing entrance and facade', surroundings: 'shophouse strip or medical centre, street-level parking' },
    school: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'School', label: 'School', environment: 'school campus with main teaching block, central courtyard, covered walkways, and a sports field', visualStyle: 'elevated angle showing full campus layout', surroundings: 'perimeter fencing, school bus drop-off, neighbourhood streets' },
    library: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Library', label: 'Public Library', environment: 'contemporary library with large reading-room windows, bookshelf silhouettes inside, and entrance plaza', visualStyle: '45-degree isometric highlighting the facade and reading-room glazing', surroundings: 'civic plaza, trees, pedestrian paths' },
    university: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'University', label: 'University', environment: 'university campus with multiple academic blocks, student plazas, and landscaped grounds', visualStyle: 'wide aerial isometric showing campus as a whole', surroundings: 'urban context, student housing, transit links' },
    kindergarten: { sceneCategory: 'building', bgKey: 'residential', signLabel: 'Kindergarten', label: 'Kindergarten', environment: 'bright colourful kindergarten with play area, climbing structures, and cheerful exterior colours', visualStyle: '45-degree isometric emphasising the play yard', surroundings: 'residential neighbourhood, garden fence, drop-off lane' },
    shopping_mall: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Mall', label: 'Shopping Mall', environment: 'large shopping mall with grand atrium, multi-level retail wings, glass skylights, and entrance plaza', visualStyle: 'high birds-eye isometric showing full mall footprint and car park', surroundings: 'surface car parks, bus lanes, drop-off circles' },
    supermarket: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Mall', label: 'Shopping Mall', environment: 'large shopping mall with grand atrium, multi-level retail wings, glass skylights, and entrance plaza', visualStyle: 'high birds-eye isometric showing full mall footprint and car park', surroundings: 'surface car parks, bus lanes, drop-off circles' },
    convenience_store: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Mini Mart', label: 'Convenience Store', environment: 'compact 24-hour convenience store with bright lighting and forecourt', visualStyle: '45-degree isometric compact storefront view', surroundings: 'residential street, petrol station or shophouse strip' },
    store: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Shop', label: 'Retail Store', environment: 'retail store with well-lit shopfront and display windows', visualStyle: '45-degree isometric storefront view', surroundings: 'commercial strip, neighbouring shops, pavement' },
    electronics_store: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Electronics', label: 'Electronics Store', environment: 'modern electronics store with large display signage and product displays through glass', visualStyle: '45-degree isometric showing facade and product displays', surroundings: 'commercial district, neighbouring retail' },
    clothing_store: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Fashion', label: 'Clothing Store', environment: 'fashion boutique with stylish facade and mannequins in window displays', visualStyle: '45-degree isometric shopfront view', surroundings: 'fashion district, pedestrian mall, neighbouring boutiques' },
    furniture_store: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Furniture', label: 'Furniture Store', environment: 'large furniture showroom with warehouse-style facade and display room windows', visualStyle: '45-degree isometric showing showroom scale', surroundings: 'commercial area, large car park, access road' },
    gym: { sceneCategory: 'building', bgKey: 'sports', signLabel: 'Gym', label: 'Gymnasium', environment: 'modern gymnasium building with glass facade and visible workout equipment inside', visualStyle: '45-degree isometric showing entrance and main facade', surroundings: 'urban street, neighbouring shophouses or commercial buildings' },
    hotel: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Hotel', label: 'Hotel', environment: 'hotel with grand entrance porte-cochère, upper-floor balconies, and rooftop pool', visualStyle: '45-degree isometric showing full hotel tower and forecourt', surroundings: 'urban street, drop-off loop, landscaping' },
    lodging: { sceneCategory: 'building', bgKey: 'residential', signLabel: 'Hotel', label: 'Hotel', environment: 'hotel or lodging building with welcoming entrance and guest amenities', visualStyle: '45-degree isometric showing full hotel tower and forecourt', surroundings: 'urban street, drop-off loop, landscaping' },
    spa: { sceneCategory: 'building', bgKey: 'residential', signLabel: 'Spa', label: 'Spa & Wellness Centre', environment: 'spa building with serene facade, zen garden entrance, and warm natural cladding', visualStyle: '45-degree isometric showing serene garden and facade', surroundings: 'quiet street, greenery, neighbouring wellness businesses' },
    beauty_salon: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Salon', label: 'Beauty Salon', environment: 'beauty salon with stylish shopfront and backlit signage', visualStyle: '45-degree isometric shopfront view', surroundings: 'retail strip, pavement, neighbouring boutiques' },
    car_dealer: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Car Showroom', label: 'Car Dealership', environment: 'car showroom with glass facade, display vehicles inside, and a forecourt', visualStyle: '45-degree isometric showing showroom glass and forecourt', surroundings: 'road frontage, service centre at rear, neighbouring retail' },
    car_repair: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Workshop', label: 'Auto Workshop', environment: 'auto workshop with roller-shutter bays and vehicle lifts visible inside', visualStyle: '45-degree isometric showing workshop bays', surroundings: 'industrial estate or roadside, tyre shop neighbours' },
    car_wash: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Car Wash', label: 'Car Wash', environment: 'drive-through car wash tunnel with automated equipment and queuing lane', visualStyle: 'overhead isometric showing vehicle flow through tunnel', surroundings: 'petrol station or commercial strip' },
    gas_station: { sceneCategory: 'building', bgKey: 'transit', signLabel: 'Petrol Station', label: 'Petrol Station', environment: 'petrol station with canopy over pump islands and a convenience store', visualStyle: 'overhead isometric showing pump layout and canopy', surroundings: 'road junction, neighbouring retail, traffic flow' },
    laundry: { sceneCategory: 'building', bgKey: 'residential', signLabel: 'Laundry', label: 'Laundry', environment: 'self-service laundromat with rows of machines visible through the shopfront', visualStyle: '45-degree isometric shopfront view', surroundings: 'residential neighbourhood, pavement' },
    atm: { sceneCategory: 'building', bgKey: 'business', signLabel: 'ATM', label: 'ATM Kiosk', environment: 'standalone ATM kiosk with enclosed booth and security features', visualStyle: 'close-up isometric kiosk view', surroundings: 'pavement, retail building facade it is attached to' },
    insurance_agency: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Insurance', label: 'Insurance Agency', environment: 'professional office building with corporate signage and client reception', visualStyle: '45-degree isometric office view', surroundings: 'business district' },
    real_estate_agency: { sceneCategory: 'building', bgKey: 'residential', signLabel: 'Real Estate', label: 'Real Estate Agency', environment: 'real estate agency office with property listings displayed in the window', visualStyle: '45-degree isometric shopfront view', surroundings: 'residential or commercial strip' },
    apartment: { sceneCategory: 'building', bgKey: 'residential', signLabel: 'Apartment', label: 'Apartment', environment: 'residential apartment block with uniform balconies, lobby entrance, and landscaped podium', visualStyle: '45-degree isometric showing full tower', surroundings: 'residential neighbourhood, access road, gardens' },

    // 🚦 Public & Government
    police: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Police', label: 'Police Station', environment: 'police station with secure frontage, duty-room windows, vehicle bay, and flag above entrance', visualStyle: '45-degree isometric showing secure facade', surroundings: 'community street, adjacent civic buildings' },
    fire_station: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Fire Station', label: 'Fire Station', environment: 'fire station with large roller-shutter bays for engines and a watch tower', visualStyle: '45-degree isometric showing bays and tower', surroundings: 'access road, nearby residential or commercial blocks' },
    city_hall: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'City Hall', label: 'City Hall', environment: 'civic building with formal facade, columns, public plaza, and flagpoles', visualStyle: '45-degree isometric emphasising civic grandeur', surroundings: 'public plaza, fountains, administrative buildings' },
    courthouse: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Courthouse', label: 'Courthouse', environment: 'formal courthouse with authoritative facade, public steps, and coat-of-arms motif', visualStyle: '45-degree isometric showing formal entrance', surroundings: 'civic precinct, public plaza, legal offices' },
    embassy: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Embassy', label: 'Embassy', environment: 'embassy with formal facade, national flag, security perimeter walls, and flagpoles', visualStyle: '45-degree isometric emphasising flag and perimeter security', surroundings: 'diplomatic quarter, tree-lined street, security barriers' },
    post_office: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Post Office', label: 'Post Office', environment: 'post office with government-style facade and service counters visible inside', visualStyle: '45-degree isometric storefront view', surroundings: 'town centre, neighbouring shops, pavement' },
    mosque: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Mosque', label: 'Mosque', environment: 'traditional mosque with central dome, tall minaret, crescent finial, and ablution courtyard', visualStyle: '45-degree isometric showing dome profile and minaret height', surroundings: 'surrounding community, access paths, tree shading' },
    church: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Church', label: 'Church', environment: 'church with bell tower, stained-glass windows, and surrounding garden', visualStyle: '45-degree isometric emphasising the tower silhouette', surroundings: 'church grounds, gardens, adjacent parish buildings' },
    hindu_temple: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Temple', label: 'Hindu Temple', environment: 'colourful Hindu temple with towering gopuram gate, inner sanctum, and lamp-lit corridors', visualStyle: '45-degree isometric showing gopuram and courtyard plan', surroundings: 'ceremonial forecourt, surrounding neighbourhood, tree shading' },
    place_of_worship: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Prayer Hall', label: 'Place of Worship', environment: 'religious building with distinctive roof form and spiritual garden forecourt', visualStyle: '45-degree isometric', surroundings: 'community space, gardens, access paths' },
    museum: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Museum', label: 'Museum', environment: 'museum with distinctive architecture, large forecourt, exhibition banners, and skylights', visualStyle: '45-degree isometric showing architectural character', surroundings: 'civic precinct, gardens, pedestrian plazas' },
    art_gallery: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Gallery', label: 'Art Gallery', environment: 'contemporary art gallery with minimal white facade, skylights, and sculptural entrance element', visualStyle: '45-degree isometric emphasising minimal geometry', surroundings: 'arts precinct, pedestrian paths, neighbouring cultural buildings' },
    movie_theater: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Cinema', label: 'Cinema', environment: 'multiplex cinema with tall illuminated fascia board, glass lobby, and escalators visible inside', visualStyle: '45-degree isometric showing fascia and lobby glazing', surroundings: 'shopping mall or entertainment district, car parks' },

    // 🌳 Outdoor & Natural
    park: { sceneCategory: 'nature', bgKey: 'nature', signLabel: 'Park', label: 'Public Park', environment: 'lush green park with manicured lawns, walking paths, benches, lamp posts, and flowering shrubs', visualStyle: 'wide aerial showing full park boundary and greenery', surroundings: 'surrounding urban streets, nearby residential buildings, trees forming a canopy' },
    campground: { sceneCategory: 'nature', bgKey: 'nature', signLabel: 'Campground', label: 'Campground', environment: 'open campground with clearings, picnic tables, fire pits, and access roads lined with tall trees', visualStyle: 'isometric aerial emphasising open space', surroundings: 'forest, grass areas, car parks at perimeter' },
    natural_feature: { sceneCategory: 'nature', bgKey: 'nature', signLabel: 'Nature Reserve', label: 'Natural Feature', environment: 'natural landscape with dense vegetation, native trees, and natural ground cover', visualStyle: 'elevated angle showing the natural feature blending into urban context', surroundings: 'city edge, transitional zone between urban and natural' },
    zoo: { sceneCategory: 'nature', bgKey: 'nature', signLabel: 'Zoo', label: 'Zoo', environment: 'zoological park with animal enclosures, visitor pathways, and tropical planting', visualStyle: 'wide aerial isometric showing enclosure layout', surroundings: 'perimeter fence, car parks, access road' },
    aquarium: { sceneCategory: 'building', bgKey: 'nature', signLabel: 'Aquarium', label: 'Aquarium', environment: 'aquarium building with curved glass facades, ocean-themed murals, and water feature entrance', visualStyle: '45-degree isometric showing curved facade', surroundings: 'civic precinct, waterfront or park, pedestrian plaza' },
    tourist_attraction: { sceneCategory: 'building', bgKey: 'civic', signLabel: 'Attraction', label: 'Tourist Attraction', environment: 'notable tourist attraction with distinctive architectural feature and visitor forecourt', visualStyle: '45-degree isometric showing the distinctive feature prominently', surroundings: 'urban context, pedestrian approach paths' },
    amusement_park: { sceneCategory: 'nature', bgKey: 'nature', signLabel: 'Theme Park', label: 'Amusement Park', environment: 'theme park with colourful ride structures, main gate arch, and lush tropical planting', visualStyle: 'wide aerial isometric showing ride layout and green zones', surroundings: 'perimeter fence, car parks, access road' },
    stadium: { sceneCategory: 'sports', bgKey: 'sports', signLabel: 'Stadium', label: 'Stadium', environment: 'large stadium with tiered seating, athletics track, floodlights, and spectator entrance gates', visualStyle: 'high birds-eye overhead showing the full oval or rectangular footprint', surroundings: 'large surface car parks, pedestrian plazas, transport drop-off zones' },
    sports_complex: { sceneCategory: 'sports', bgKey: 'sports', signLabel: 'Sports Complex', label: 'Sports Complex', environment: 'multi-purpose sports complex with multiple courts, tracks, and covered halls', visualStyle: 'overhead isometric emphasising multiple facilities', surroundings: 'large grounds, access roads, spectator areas' },
    bowling_alley: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Bowling', label: 'Bowling Alley', environment: 'entertainment building with bold signage, wide entrance canopy, and parking forecourt', visualStyle: '45-degree isometric view', surroundings: 'strip mall or commercial area' },
    golf_course: { sceneCategory: 'nature', bgKey: 'nature', signLabel: 'Golf Club', label: 'Golf Course', environment: 'manicured golf course with rolling green fairways, sand bunkers, flag poles on greens, and a clubhouse', visualStyle: 'sweeping aerial at low angle to show fairway contours', surroundings: 'trees and water hazards, residential estate beyond perimeter' },
    cemetery: { sceneCategory: 'nature', bgKey: 'nature', signLabel: 'Cemetery', label: 'Cemetery', environment: 'cemetery with orderly headstone rows, gravel paths, shade trees, and a chapel gate', visualStyle: 'elevated aerial showing rows and tree canopy', surroundings: 'perimeter wall, residential streets beyond' },

    // 🚉 Transport
    airport: { sceneCategory: 'transit', bgKey: 'transit', signLabel: 'Airport', label: 'Airport', environment: 'airport terminal with jet bridges, taxiways, aircraft on apron, and drop-off road system', visualStyle: 'very high aerial showing terminal, apron, and runway context', surroundings: 'runways, cargo zones, access highways' },
    bus_station: { sceneCategory: 'transit', bgKey: 'transit', signLabel: 'Bus Terminal', label: 'Bus Terminal', environment: 'bus terminal with covered bus bays, ticketing hall, and waiting concourse', visualStyle: 'wide aerial isometric showing bus bay layout', surroundings: 'access roads, taxi stands, pedestrian connections' },
    train_station: { sceneCategory: 'transit', bgKey: 'transit', signLabel: 'Train Station', label: 'Train Station', environment: 'train station with platform canopy, station building, passenger concourse, and rail tracks', visualStyle: 'high aerial showing station and track alignment', surroundings: 'rail corridor, bus interchange, car parks' },
    subway_station: { sceneCategory: 'transit', bgKey: 'transit', signLabel: 'MRT Station', label: 'MRT / Subway Station', environment: 'metro station entrance pavilion with canopy, fare gates, and underground entrance', visualStyle: '45-degree isometric showing entrance pavilion and surroundings', surroundings: 'urban plaza, bus stops, pedestrian walkways' },
    taxi_stand: { sceneCategory: 'transit', bgKey: 'transit', signLabel: 'Taxi Stand', label: 'Taxi Stand', environment: 'covered taxi stand with queue shelter, pick-up and drop-off zones, and directional signage', visualStyle: '45-degree isometric street-level view', surroundings: 'urban street, adjacent building facade, pavement' },
    parking: { sceneCategory: 'parking', bgKey: 'parking', signLabel: 'Car Park', label: 'Car Park', environment: 'multi-storey car park with clearly marked bays, access ramps, and ticketing booths', visualStyle: 'overhead isometric showing parking bay grid', surroundings: 'access roads, nearby commercial buildings' },

    // 🏠 Residential & Real Estate
    establishment: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Building', label: 'Commercial Building', environment: 'modern commercial building with clean rectangular massing and ground-floor retail', visualStyle: '45-degree isometric street-corner view', surroundings: 'urban street grid, neighbouring commercial blocks, pavement' },
    point_of_interest: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Landmark', label: 'Point of Interest', environment: 'notable urban landmark with distinctive feature that draws visitors', visualStyle: '45-degree isometric showing the distinctive feature prominently', surroundings: 'urban context, pedestrian approach paths' },
    locksmith: { sceneCategory: 'building', bgKey: 'business', signLabel: 'Locksmith', label: 'Locksmith', environment: 'small shopfront locksmith with key-duplicate machines in the window and a service counter', visualStyle: '45-degree isometric shopfront view', surroundings: 'commercial strip' },
};

const BUILDING_TYPES = [
    'library', 'school', 'hospital', 'clinic', 'mosque', 'church', 'temple',
    'park', 'garden', 'playground', 'market', 'mall', 'shop', 'store',
    'restaurant', 'cafe', 'hotel', 'office', 'bank', 'pharmacy', 'gym',
    'stadium', 'museum', 'gallery', 'university', 'college', 'kindergarten',
    'parking', 'parking lot', 'bus station', 'train station', 'airport',
    'community centre', 'community center', 'sports complex', 'swimming pool',
    'fire station', 'police station', 'post office', 'government building',
    'football field', 'football court', 'basketball court', 'tennis court',
    'forest', 'lake', 'river', 'beach', 'mountain'
];

export function extractBuildingType(commentText: string) {
    const lower = commentText.toLowerCase();
    return BUILDING_TYPES.find(type => lower.includes(type)) || null;
}

export function resolvePlaceScene(types: string[]) {
    const SKIP = new Set(['point_of_interest', 'establishment', 'locality', 'political',
        'neighborhood', 'sublocality', 'sublocality_level_1', 'sublocality_level_2',
        'administrative_area_level_1', 'administrative_area_level_2',
        'administrative_area_level_3', 'country', 'postal_code', 'route', 'geocode']);

    for (const t of types) {
        if (!SKIP.has(t) && PLACE_TYPE_SCENE_MAP[t]) return PLACE_TYPE_SCENE_MAP[t];
    }

    if (types.includes('establishment') && PLACE_TYPE_SCENE_MAP['establishment']) return PLACE_TYPE_SCENE_MAP['establishment'];

    return {
        sceneCategory: 'building',
        label: 'Urban Building',
        environment: 'modern urban building with clean rectangular massing, a glass curtain-wall facade, and ground-floor retail',
        visualStyle: '45-degree isometric street-corner view',
        surroundings: 'urban street grid, neighbouring buildings, pavement',
        bgKey: 'default'
    };
}

export function buildImagePrompt(
    commentText: string,
    placeScene: any,
    envAnalysis: string | null,
    satelliteAnalysis: string | null,
    placeName: string,
    placeAddress: string,
    placeTypes: string[],
    lat?: number,
    lng?: number
) {
    const addrParts = (placeAddress || '').split(',').map(s => s.trim());
    const city = addrParts.length >= 2 ? addrParts[addrParts.length - 2] : 'Kuala Lumpur';
    const country = addrParts.length >= 1 ? addrParts[addrParts.length - 1] : 'Malaysia';

    const floorMatch = commentText.match(/(\d+)\s*(floor|storey|story|level)/i);
    const numFloors = floorMatch ? floorMatch[1] : '4';
    const rooftopMatch = commentText.match(/rooftop|roof\s?(garden|terrace|pool|parking|solar)/i);
    const rooftopFeature = rooftopMatch ? rooftopMatch[0] : 'green terrace';

    const commentOverrideType = extractBuildingType(commentText);
    let activeScene = placeScene;
    if (commentOverrideType) {
        const overrideKey = commentOverrideType.replace(/ /g, '_');
        const overrideScene = PLACE_TYPE_SCENE_MAP[overrideKey] || PLACE_TYPE_SCENE_MAP[commentOverrideType];
        if (overrideScene) activeScene = overrideScene;
    }

    const activeBg = BACKGROUNDS[activeScene.bgKey] || BACKGROUNDS.default;
    const signText = (activeScene.signLabel || activeScene.label || 'Building').toUpperCase();
    const googleTypesLabel = (placeTypes || []).filter(t => !['point_of_interest', 'establishment'].includes(t)).join(', ') || 'unknown';

    const satelliteCtx = satelliteAnalysis
        ? `SATELLITE MAP ANALYSIS — calibrate background density and road layout: \n"${satelliteAnalysis.trim()}"`
        : 'No satellite data — use category background defaults.';
    const streetViewCtx = envAnalysis
        ? `STREET VIEW ANALYSIS — calibrate architectural style and urban scale: \n"${envAnalysis.trim()}"`
        : '';

    const QUALITY = `
━━ IMAGE QUALITY — MANDATORY ━━
- Maximum render resolution, razor-sharp edges on every element
- Zero blur of any kind (motion, depth-of-field, atmospheric)
- Zero fog, haze, glow, bokeh, or lens flare
- Signboard letters: PERFECTLY LEGIBLE — crisp flat vector-quality shapes, each letter individually clear
- Geometric lines (walls, roads, windows): perfectly straight
- High colour contrast — no muddy or washed-out tones
- Zero noise, grain, or compression artefacts`;

    const commonHeader = `Generate a crisp 3D digital-twin smart-city architectural visualization.
PLACE TYPE: ${activeScene.label} | ${city}, ${country}
COORDINATES: ${lat?.toFixed(6) || 'N/A'}, ${lng?.toFixed(6) || 'N/A'}
MAPS TYPES: ${googleTypesLabel}
`;

    // ── NATURE ────────────────────────────────────────────────────────
    if (activeScene.sceneCategory === 'nature') {
        return `${commonHeader}
━━ SCENE: NATURAL / OPEN SPACE ━━
Do NOT place any building as the central focus.
${activeScene.environment}
User vision: ${commentText}

━━ BACKGROUND ━━
Base: ${activeBg.base} | Ground: ${activeBg.ground} | Void: ${activeBg.sky} | Lighting: ${activeBg.accent}

━━ SATELLITE CONTEXT ━━
${satelliteCtx}
→ If satellite shows dense tree canopy, replicate that density. If open grass, keep it open. Merge both layers.
${streetViewCtx}

━━ VISUAL STYLE ━━
3D smart-city / digital twin, flat low-poly geometry, solid matte colours. Simple geometric trees (cone or sphere on cylinder stem). Minimal shadows, even clinical lighting.
${QUALITY}`;
    }

    // ── SPORTS ────────────────────────────────────────────────────────
    if (activeScene.sceneCategory === 'sports') {
        return `${commonHeader}
━━ SCENE: SPORTS FACILITY ━━
${activeScene.environment}
User vision: ${commentText}

━━ BACKGROUND ━━
Base: ${activeBg.base} | Ground: ${activeBg.ground} | Void: ${activeBg.sky} | Lighting: ${activeBg.accent}

━━ SATELLITE CONTEXT ━━
${satelliteCtx}
→ Use satellite to determine if this sports area is enclosed by trees, urban streets, or suburban houses — render background accordingly.

━━ COURT / FIELD ━━
- Crisp painted line markings on the playing surface
- Floodlight poles at corners if applicable
- Simple blocky spectator stands if present

━━ ENTRANCE SIGNBOARD ━━
Font: very large, bold, clean sans-serif capitals. Colour: white letters on dark panel. Text: ${signText}. Rule: show ONLY these characters — no subtitle, no address.

━━ VISUAL STYLE ━━
3D smart-city digital twin, flat low-poly, solid matte colours. Minimal shadows, even clinical lighting. Background void: ${activeBg.sky}
${QUALITY}`;
    }

    // ── PARKING ───────────────────────────────────────────────────────
    if (activeScene.sceneCategory === 'parking') {
        return `${commonHeader}
━━ SCENE: PARKING FACILITY ━━
${activeScene.environment}
User vision: ${commentText}

━━ BACKGROUND ━━
Base: ${activeBg.base} | Ground: ${activeBg.ground} | Void: ${activeBg.sky} | Lighting: ${activeBg.accent}

━━ SATELLITE CONTEXT ━━
${satelliteCtx}
→ If satellite shows surrounding commercial blocks, add simple dark-grey cube buildings in background.

━━ ENTRANCE SIGNBOARD ━━
Font: very large, bold, clean sans-serif capitals. Text: ${signText}. Rule: ONE sign panel — no extra text.

━━ VISUAL STYLE ━━
3D smart-city digital twin, flat matte surfaces. Grey concrete decks, white bay stencils, simple muted-colour cars. Background void: ${activeBg.sky}
${QUALITY}`;
    }

    // ── TRANSIT ───────────────────────────────────────────────────────
    if (activeScene.sceneCategory === 'transit') {
        return `${commonHeader}
━━ SCENE: TRANSIT / TRANSPORT HUB ━━
${activeScene.environment}
User vision: ${commentText}

━━ BACKGROUND ━━
Base: ${activeBg.base} | Ground: ${activeBg.ground} | Void: ${activeBg.sky} | Lighting: ${activeBg.accent}

━━ SATELLITE CONTEXT ━━
${satelliteCtx}
→ If satellite shows elevated rail or highways, render as abstract grey structural elements in background.

━━ STATION SIGNBOARD ━━
Font: very large, bold, clean sans-serif capitals. Colours: white letters on blue panel (standard transit style). Text: ${signText}. Rule: ONE sign — no extra text.

━━ VISUAL STYLE ━━
3D smart-city digital twin, geometric structural canopies, simple blocky vehicles. Background void: ${activeBg.sky}
${QUALITY}`;
    }

    // ── BUILDING (default) ────────────────────────────────────────────
    return `${commonHeader}
━━ BUILDING ━━
${activeScene.environment}

━━ ARCHITECTURE ━━
- ${numFloors} floors, modern architectural massing
- Facade: white/grey walls, blue glass panels, clean geometric forms
- Flat roof with: ${rooftopFeature}
- Ground-floor entrance canopy and podium

━━ SIGNBOARD — MANDATORY ━━
ONE large sign on the main facade above the entrance.
• Rectangular panel, backlit or embossed, at parapet level
• Font: very large, bold, clean sans-serif capitals (Arial Black / Futura Bold style)
• Colour: white letters on dark panel — high contrast
• Text: ${signText}
• Rule: Show EXACTLY "${signText}" — every letter crisp and legible. No address or tagline.

━━ BACKGROUND ━━
Base: ${activeBg.base} | Ground: ${activeBg.ground} | Void: ${activeBg.sky} | Lighting: ${activeBg.accent}

━━ SATELLITE CONTEXT ━━
${satelliteCtx}
→ Dense buildings on satellite → dark-grey cube background buildings. Open land → flat green background. Merge with category base.
${streetViewCtx}

━━ USER VISION ━━
${commentText}

━━ SPATIAL LAYOUT ━━
- Dark grey asphalt roads with white/yellow lane markings and crossings
- Raised grey sidewalks with kerb detail
- Background buildings: simple featureless dark-grey cubes ONLY

━━ VISUAL STYLE ━━
3D smart-city digital twin, isometric or 45-degree birds-eye, flat low-poly surfaces. Solid matte colours: stark white walls, solid blue glass. Background void: ${activeBg.sky}. Minimal shadows.
${QUALITY}`;
}


'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary, MapControl, ControlPosition } from '@vis.gl/react-google-maps';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageSquare, Flag, Search } from 'lucide-react';
import SidePanel from './SidePanel';
import IdeaGallery from './IdeaGallery';
import Dashboard from './Dashboard';
import { useAuth } from '@/context/AuthContext';
import { getImageSrc } from '@/lib/utils';

export type RenovationPin = {
    id: string;
    lat: number;
    lng: number;
    review: string;
    businessType: string;
    saturationIndex: number | null;
    visionImage?: string;
    author?: string;
    agreementCount?: number;
};

// A dark mode theme for Google Maps
const darkTheme = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#263c3f' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9a76' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#38414e' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#212a37' }],
    },
    {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca5b3' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#746855' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1f2835' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f3d19c' }],
    },
    {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }],
    },
    {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#17263c' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#515c6d' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#17263c' }],
    }
];

function MapSearch({ onPlaceSelect }: { onPlaceSelect: (place: google.maps.places.PlaceResult) => void }) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const places = useMapsLibrary('places');

    useEffect(() => {
        if (!places || !inputRef.current) return;
        const autocomplete = new places.Autocomplete(inputRef.current, { fields: ['geometry', 'name'] });

        const listener = autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                onPlaceSelect(place);
            }
        });

        return () => {
            google.maps.event.removeListener(listener);
        };
    }, [places, onPlaceSelect]);

    return (
        <MapControl position={ControlPosition.TOP_CENTER}>
            <div className="mt-4 md:mt-6 p-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 shadow-2xl flex items-center pr-4 transition-all focus-within:ring-2 focus-within:ring-purple-500/50">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 ml-1">
                    <Search className="w-4 h-4 text-purple-300" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search city or location..."
                    className="bg-transparent text-white text-sm w-48 md:w-80 px-4 py-2 outline-none placeholder-gray-400 font-medium"
                />
            </div>
        </MapControl>
    );
}

export default function Map() {
    return (
        <APIProvider
            apiKey={(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.includes('Dummy')) ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : ''}
            libraries={['places', 'marker', 'geometry']}
        >
            <MapInner />
        </APIProvider>
    );
}

function MapInner() {
    const [pins, setPins] = useState<RenovationPin[]>([]);
    const [tempPin, setTempPin] = useState<{ lat: number, lng: number } | null>(null);
    const [pendingPin, setPendingPin] = useState<{ lat: number, lng: number } | null>(null);
    const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
    const [mapData, setMapData] = useState({ lat: 3.1390, lng: 101.6869, zoom: 6 });
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
    const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
    const [refiningIdea, setRefiningIdea] = useState<RenovationPin | null>(null);

    // Auth context
    const { user, loginWithGoogle } = useAuth();

    // Map hooks must be declared before callbacks
    const map = useMap();
    const placesLib = useMapsLibrary('places');

    const handleAiResponse = (action: any) => {
        if (action.map_action === "MOVE_TO" && action.coordinates) {
            const { lat, lng } = action.coordinates;
            setMapData(prev => ({ ...prev, lat, lng }));
            if (map) {
                map.panTo({ lat, lng });
            }
        }
    };

    const handleSearchSelect = useCallback((place: google.maps.places.PlaceResult) => {
        if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setMapData(prev => ({ ...prev, lat, lng, zoom: 14 }));
            map?.panTo({ lat, lng });
            map?.setZoom(14);
        }
    }, [map]);

    const fetchPins = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'pins'));
            const fetchedPins: RenovationPin[] = [];
            querySnapshot.forEach((doc) => {
                fetchedPins.push({ id: doc.id, ...doc.data() } as RenovationPin);
            });
            setPins(fetchedPins);
        } catch (error) {
            console.error("Error fetching pins:", error);
        }
    };

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'pins'), 
            (snapshot) => {
                const fetchedPins: RenovationPin[] = [];
                snapshot.forEach((doc) => {
                    fetchedPins.push({ id: doc.id, ...doc.data() } as RenovationPin);
                });
                setPins(fetchedPins);
            },
            (error) => {
                console.error("Firestore Error Fetching Pins:", error);
                alert("Database Error: Could not load pins. Please check your Firebase Console Security Rules (they may be missing or expired).");
            }
        );
        return () => unsubscribe();
    }, []);

    const handleRightClick = (e: any) => {
        if (e.detail?.latLng || e.latLng) {
            handleMapClick(e);
        }
    };


    const handleMapClick = useCallback((e: any) => {
        if (!map || !placesLib) {
            console.log("[CivicSense] Map dependencies not ready:", {
                map: !!map,
                places: !!placesLib
            });
            return;
        }

        if (tempPin) return; // Lock the map pin while chat is open, but allow moving the green confirmation pin freely

        const latLng = e.detail?.latLng || e.latLng;
        const placeId = e.detail?.placeId;

        if (!latLng) return;

        const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
        const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

        const REGION_TYPES = [
            'locality', 'political', 'neighborhood', 'sublocality',
            'sublocality_level_1', 'sublocality_level_2',
            'administrative_area_level_1', 'administrative_area_level_2',
            'administrative_area_level_3', 'administrative_area_level_4',
            'country', 'postal_code', 'route', 'geocode',
            'colloquial_area', 'natural_feature'
        ];

        const isRegionType = (types: string[]) => {
            return types && types.length > 0 && types.every(t => REGION_TYPES.includes(t));
        };

        // Open confirmation overlay before starting the chat
        setSelectedPlaceName("Detecting location...");
        setPendingPin({ lat, lng });

        const findNearestBusiness = (loc: { lat: number, lng: number }, service: google.maps.places.PlacesService) => {
            console.log("[CivicSense] Searching for context at", loc);

            // Priority 1: Geocode for Area/Neighborhood Name
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: loc }, (gResults: any, gStatus: any) => {
                console.log("[CivicSense] Geocode status:", gStatus);
                const isGeoOk = gStatus === 'OK' || gStatus === google.maps.GeocoderStatus.OK;

                if (isGeoOk && gResults?.[0]) {
                    const result = gResults[0];
                    const area = result.address_components.find((c: any) =>
                        c.types.includes('neighborhood') ||
                        c.types.includes('sublocality') ||
                        c.types.includes('locality')
                    );

                    // If we found a specific area/neighborhood, use it
                    if (area && !area.types.includes('country')) {
                        console.log("[CivicSense] Found area name:", area.long_name);
                        setSelectedPlaceName(area.long_name);
                        return;
                    }
                }

                // Priority 2: Nearby Search for Establishment
                service.nearbySearch({
                    location: loc,
                    radius: 50,
                    type: 'establishment'
                }, (results, status) => {
                    console.log("[CivicSense] nearbySearch status:", status);
                    const isOk = (status as any) === 'OK' || (status as any) === (placesLib as any).PlacesServiceStatus.OK;
                    if (isOk && results && results.length > 0) {
                        const foundName = results[0].name || "New Development";
                        console.log("[CivicSense] nearbySearch found business:", foundName);
                        setSelectedPlaceName(foundName);
                    } else if (gResults?.[0]) {
                        // Fallback to formatted address
                        setSelectedPlaceName(gResults[0].formatted_address.split(',')[0]);
                    } else {
                        setSelectedPlaceName(`Location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
                    }
                });
            });
        };

        const service = new placesLib.PlacesService(map);
        const latLngObj = { lat, lng };

        // Smart Detection: Check if there's already a pin here (within ~11 meters)
        const existingPin = pins.find(p => (
            Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001
        ));

        if (existingPin) {
            console.log("[CivicSense] Existing pin detected. Opening gallery.");
            setSelectedLocation({ lat: existingPin.lat, lng: existingPin.lng });
            return;
        }

        if (placeId) {
            console.log("[CivicSense] POI clicked. ID:", placeId);
            if (e.stop) e.stop();
            service.getDetails({ placeId, fields: ['name', 'types', 'formatted_address'] }, (place, status) => {
                console.log("[CivicSense] getDetails status:", status);
                const isDetOk = (status as any) === 'OK' || (status as any) === (placesLib as any).PlacesServiceStatus.OK;
                if (isDetOk) {
                    if (place && isRegionType(place.types || [])) {
                        console.log("[CivicSense] Region detected (" + place.name + "), checking for businesses...");
                        findNearestBusiness(latLngObj, service);
                    } else if (place) {
                        console.log("[CivicSense] Specific place detected:", place.name);
                        setSelectedPlaceName(place.name || "Unknown Place");
                    }
                } else {
                    console.warn("[CivicSense] getDetails failed. Falling back to nearby search.");
                    findNearestBusiness(latLngObj, service);
                }
            });
        } else {
            console.log("[CivicSense] Background click at:", latLngObj);
            findNearestBusiness(latLngObj, service);
        }
    }, [user, map, placesLib, tempPin, pendingPin]);

    const handleCancel = () => {
        setTempPin(null);
        setPendingPin(null);
        setSelectedPlaceName(null);
        setRefiningIdea(null);
    };

    const handlePinCreated = () => {
        const savedLocation = tempPin;
        setTempPin(null);
        setRefiningIdea(null);
        // fetchPins(); // No longer needed as onSnapshot handles it

        // If we were refining, or even if it's a new pin, show the updated gallery for that spot
        if (savedLocation) {
            setSelectedLocation({ lat: savedLocation.lat, lng: savedLocation.lng });
        }
    };

    const handleFabClick = () => {
        if (user) {
            // Default center if no right click occurred
            setTempPin({ lat: mapData.lat, lng: mapData.lng });
        } else {
            loginWithGoogle();
        }
    };

    // Group pins by location
    const groupedPins = pins.reduce((acc, pin) => {
        const key = `${pin.lat.toFixed(6)},${pin.lng.toFixed(6)}`;
        if (!acc[key]) {
            acc[key] = {
                lat: pin.lat,
                lng: pin.lng,
                mainPinId: pin.id,
                ideas: []
            };
        }
        acc[key].ideas.push(pin);
        return acc;
    }, {} as Record<string, { lat: number, lng: number, mainPinId: string, ideas: RenovationPin[] }>);

    // Sort ideas inside groups by agreementCount to showcase best iterations on Map Tooltips
    Object.values(groupedPins).forEach(group => {
        group.ideas.sort((a, b) => (b.agreementCount || 0) - (a.agreementCount || 0));
    });

    const activeIdeasForLocation = selectedLocation
        ? groupedPins[`${selectedLocation.lat.toFixed(6)},${selectedLocation.lng.toFixed(6)}`]?.ideas || []
        : [];

    return (
        <div className="w-full h-full relative" id="civic-map-container">
            <GoogleMap
                id="main-map"
                defaultCenter={{ lat: mapData.lat, lng: mapData.lng }}
                defaultZoom={mapData.zoom}
                center={{ lat: mapData.lat, lng: mapData.lng }}
                zoom={mapData.zoom}
                onCameraChanged={(ev: any) => {
                    setMapData({
                        lat: ev.detail.center.lat,
                        lng: ev.detail.center.lng,
                        zoom: ev.detail.zoom
                    });
                }}
                mapId="1f3885acd6cb624ad53f4c6c"
                onContextmenu={handleRightClick}
                onClick={handleMapClick}
                disableDefaultUI={true}
                clickableIcons={true}
            >
                {Object.values(groupedPins).map((group) => (
                    <AdvancedMarker
                        key={group.mainPinId}
                        position={{ lat: group.lat, lng: group.lng }}
                        onMouseEnter={() => setHoveredPinId(group.mainPinId)}
                        onMouseLeave={() => setHoveredPinId(null)}
                        onClick={() => setSelectedLocation({ lat: group.lat, lng: group.lng })}
                        className="group cursor-pointer"
                    >
                        <div className="relative flex items-center justify-center">
                            <motion.div
                                whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                                className="relative flex flex-col items-center"
                            >
                                <div className="bg-white/10 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center border border-white/20 shadow-xl group-hover:bg-purple-600/20 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                                        <Flag className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <div className="w-0.5 h-3 bg-gradient-to-b from-purple-500 to-transparent shadow-sm" />
                                <div className="w-3 h-1 bg-black/40 rounded-full blur-[1px] -mt-0.5" />
                            </motion.div>

                            {/* Tooltip for Saturation Index on hover */}
                            {hoveredPinId === group.mainPinId && group.ideas[0].saturationIndex !== null && (
                                <motion.div
                                    key={`tooltip-${group.mainPinId}`}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="absolute bottom-14 bg-black/60 backdrop-blur-xl rounded-[28px] p-2.5 text-xs font-semibold text-white border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 pointer-events-none min-w-[200px]"
                                >
                                    {group.ideas[0].visionImage && (
                                        <div className="w-full aspect-video rounded-[20px] overflow-hidden mb-3 border border-white/10 relative group">
                                            <img
                                                src={getImageSrc(group.ideas[0].visionImage)}
                                                alt="AI Vision"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-2 right-2 bg-purple-600/80 backdrop-blur-md px-2 py-1 rounded-full text-[8px] font-bold border border-white/20 flex items-center gap-1">
                                                <Bot className="w-2.5 h-2.5" />
                                                AI VISION
                                            </div>
                                        </div>
                                    )}
                                    <div className="px-2 pb-1">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Feasibility Score</span>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${group.ideas[0].saturationIndex! >= 85 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                {group.ideas[0].saturationIndex?.toFixed(0)}/100
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold text-white tracking-tight truncate">{group.ideas[0].businessType}</div>
                                        <div className="text-gray-300 text-[10px] mt-1 line-clamp-2 leading-tight">{group.ideas[0].review}</div>
                                        {group.ideas.length > 1 && (
                                            <div className="flex items-center gap-1.5 mt-2 text-purple-400">
                                                <div className="flex -space-x-2">
                                                    {[...Array(Math.min(3, group.ideas.length - 1))].map((_, i) => (
                                                        <div key={i} className="w-4 h-4 rounded-full bg-purple-500 border border-black flex items-center justify-center text-[6px]">
                                                            {group.ideas[i + 1].author?.charAt(0) || 'U'}
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-[9px] font-bold">+{group.ideas.length - 1} community ideas</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </AdvancedMarker>
                ))}

                {pendingPin && (
                    <AdvancedMarker position={pendingPin} zIndex={50}>
                        <motion.div
                            initial={{ scale: 0, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-gray-900 border border-purple-500 rounded-lg p-3 shadow-2xl flex flex-col gap-2 items-center min-w-[160px] pointer-events-auto"
                        >
                            <span className="text-white text-[11px] font-bold text-center leading-tight">
                                <span className="text-purple-300">{selectedPlaceName || "this area"}</span>
                            </span>
                            <div className="flex w-full mt-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTempPin(pendingPin);
                                        setPendingPin(null);
                                    }}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-[10px] font-bold py-1.5 rounded transition-colors shadow-lg uppercase tracking-wider"
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </AdvancedMarker>
                )}

                {tempPin && (
                    <AdvancedMarker position={tempPin}>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center border-2 border-white/50 animate-pulse"
                        >
                            <Pin background={'#3b82f6'} glyphColor={'#ffffff'} borderColor={'transparent'} />
                        </motion.div>
                    </AdvancedMarker>
                )}
            </GoogleMap>

            {/* AI Assistant FAB */}
            <AnimatePresence>
                {!tempPin && (
                    <motion.div
                        key="ai-fab"
                        className="absolute bottom-10 right-10 z-50 flex flex-col items-end gap-2"
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    >
                        {/* Optional Tooltip Bubble */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1 }}
                            className="bg-black/80 backdrop-blur-md text-white text-xs font-medium px-3 py-2 rounded-2xl rounded-br-none border border-white/10 shadow-xl pointer-events-none"
                        >
                            {!user ? "Sign in to chat!" : "Let's plan together!"}
                        </motion.div>

                        <button
                            onClick={handleFabClick}
                            className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 ring-4 ring-black/20"
                        >
                            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Bot className="w-6 h-6 text-white" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <Dashboard
                onSelectPin={(pin: RenovationPin) => {
                    console.log("[CivicSense] Dashboard navigating to ID:", pin.id, "Name:", pin.businessType);

                    // Prioritize exact group match by ID to avoid snapping to wrong ideas
                    const match = Object.values(groupedPins).find(g =>
                        g.ideas.some(i => i.id === pin.id)
                    );

                    const targetLat = match ? match.lat : Number(pin.lat);
                    const targetLng = match ? match.lng : Number(pin.lng);

                    console.log("[CivicSense] Navigating to target:", { targetLat, targetLng }, "Match Found:", !!match);

                    // 1. Reactive state update (Fallback/Visual Sync)
                    setMapData({ lat: targetLat, lng: targetLng, zoom: 18 });

                    // 2. Imperative movement
                    if (map) {
                        map.panTo({ lat: targetLat, lng: targetLng });
                        map.setZoom(18);
                    }

                    // 3. Focus Gallery
                    setSelectedIdeaId(pin.id);
                    setSelectedLocation({ lat: targetLat, lng: targetLng });
                }}
            />

            <SidePanel
                isOpen={!!tempPin}
                location={tempPin}
                onCancel={handleCancel}
                onSuccess={handlePinCreated}
                onAiAction={handleAiResponse}
                placeName={selectedPlaceName}
                refiningIdea={refiningIdea}
            />

            <IdeaGallery
                isOpen={!!selectedLocation}
                onClose={() => {
                    setSelectedLocation(null);
                    setSelectedIdeaId(null);
                }}
                location={selectedLocation}
                ideas={activeIdeasForLocation}
                onIdeaUpdated={fetchPins}
                initialIdeaId={selectedIdeaId}
                onAddDetails={(idea) => {
                    setRefiningIdea(idea);
                    setTempPin({ lat: idea.lat, lng: idea.lng });
                    setSelectedLocation(null);
                    setSelectedPlaceName(idea.businessType);
                }}
                onAddNewIdea={() => {
                    if (!user) {
                        loginWithGoogle();
                        return;
                    }
                    if (selectedLocation) {
                        setTempPin(selectedLocation);
                    }
                    setRefiningIdea(null);
                    setSelectedLocation(null);
                    setSelectedIdeaId(null);
                    setSelectedPlaceName(null);
                }}
            />
        </div>
    );
}

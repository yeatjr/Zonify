'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary, MapControl, ControlPosition } from '@vis.gl/react-google-maps';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageSquare, Flag, Search, Activity } from 'lucide-react';
import SidePanel from './SidePanel';
import IdeaGallery from './IdeaGallery';
import Dashboard from './Dashboard';
import { useAuth } from '@/context/AuthContext';
import { getImageSrc, getDistanceFromLatLonInKm } from '@/lib/utils';

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

interface MapProps {
    isAnalysisMode?: boolean;
    isAnalyzing?: boolean;
    analysisLocation?: { lat: number, lng: number } | null;
    onStartAnalysis?: (active: boolean) => void;
    onSelectPin?: any;
    onRunAnalysis?: (location: { lat: number; lng: number; }, nearbyPins: any[], placeName: string) => void;
    onGalleryClose?: () => void;
}

export default function Map({ isAnalysisMode = false, isAnalyzing = false, analysisLocation = null, onStartAnalysis, onSelectPin, onRunAnalysis }: MapProps) {
    return (
        <APIProvider
            apiKey={(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.includes('Dummy')) ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : ''}
            libraries={['places', 'marker', 'geometry']}
        >
            <MapInner
                isAnalysisMode={isAnalysisMode}
                isAnalyzing={isAnalyzing}
                analysisLocation={analysisLocation}
                onStartAnalysis={onStartAnalysis}
                onSelectPin={onSelectPin}
                onRunAnalysis={onRunAnalysis}
            />
        </APIProvider>
    );
}

function MapInner({ isAnalysisMode, isAnalyzing, analysisLocation, onStartAnalysis, onSelectPin: onSelectPinFromParent, onRunAnalysis, onGalleryClose }: MapProps) {
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

    // Map hooks
    const map = useMap('main-map');
    const placesLib = useMapsLibrary('places');

    const fetchPins = () => {
        // Redundant as we use onSnapshot, but kept for IdeaGallery prop compatibility
        console.log("[CivicSense] Pins refresh triggered");
    };

    // Robust check for libraries and map
    useEffect(() => {
        if (map && placesLib) {
            console.log("[CivicSense] Map and Places Library are ready.");
        }
    }, [map, placesLib]);



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
        if (!map || !placesLib) return;

        if (tempPin) return;

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

        setSelectedPlaceName("Detecting location...");
        setPendingPin({ lat, lng });

        const findNearestBusiness = (loc: { lat: number, lng: number }, service: google.maps.places.PlacesService) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: loc }, (gResults: any, gStatus: any) => {
                const isGeoOk = gStatus === 'OK' || gStatus === google.maps.GeocoderStatus.OK;

                if (isGeoOk && gResults?.[0]) {
                    const result = gResults[0];
                    const area = result.address_components.find((c: any) =>
                        c.types.includes('neighborhood') ||
                        c.types.includes('sublocality') ||
                        c.types.includes('locality')
                    );

                    if (area && !area.types.includes('country')) {
                        setSelectedPlaceName(area.long_name);
                        return;
                    }
                }

                service.nearbySearch({
                    location: loc,
                    radius: 50,
                    type: 'establishment'
                }, (results, status) => {
                    const isOk = (status as any) === 'OK' || (status as any) === (placesLib as any).PlacesServiceStatus.OK;
                    if (isOk && results && results.length > 0) {
                        setSelectedPlaceName(results[0].name || "New Development");
                    } else if (gResults?.[0]?.formatted_address) {
                        // Fallback to the full formatted address
                        setSelectedPlaceName(gResults[0].formatted_address);
                    } else {
                        setSelectedPlaceName(`Coordinates: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
                    }
                });
            });
        };

        const service = new (placesLib as any).PlacesService(map);
        const latLngObj = { lat, lng };

        const existingPin = pins.find(p => (
            Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001
        ));

        if (existingPin) {
            setSelectedLocation({ lat: existingPin.lat, lng: existingPin.lng });
            return;
        }

        if (placeId) {
            if (e.stop) e.stop();
            service.getDetails({ placeId, fields: ['name', 'types', 'formatted_address'] }, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
                const isDetOk = status === google.maps.places.PlacesServiceStatus.OK;
                if (isDetOk) {
                    if (place && isRegionType(place.types || [])) {
                        findNearestBusiness(latLngObj, service);
                    } else if (place) {
                        setSelectedPlaceName(place.name || "Unknown Place");
                    }
                } else {
                    findNearestBusiness(latLngObj, service);
                }
            });
        } else {
            findNearestBusiness(latLngObj, service);
        }
    }, [user, map, placesLib, tempPin, pins]);

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
        if (savedLocation) {
            setSelectedLocation({ lat: savedLocation.lat, lng: savedLocation.lng });
        }
    };

    const handleFabClick = () => {
        if (user) {
            setTempPin({ lat: mapData.lat, lng: mapData.lng });
        } else {
            loginWithGoogle();
        }
    };

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

    Object.values(groupedPins).forEach(group => {
        group.ideas.sort((a, b) => (b.agreementCount || 0) - (a.agreementCount || 0));
    });

    const activeIdeasForLocation = selectedLocation
        ? groupedPins[`${selectedLocation.lat.toFixed(6)},${selectedLocation.lng.toFixed(6)}`]?.ideas || []
        : [];

    // Navigation from parent
    useEffect(() => {
        if (onSelectPinFromParent && map) {
            const pin = onSelectPinFromParent;
            const match = Object.values(groupedPins).find(g =>
                g.ideas.some(i => i.id === pin.id)
            );
            const targetLat = match ? match.lat : Number(pin.lat);
            const targetLng = match ? match.lng : Number(pin.lng);

            if (selectedLocation?.lat !== targetLat || selectedLocation?.lng !== targetLng) {
                setMapData({ lat: targetLat, lng: targetLng, zoom: 18 });
                map.panTo({ lat: targetLat, lng: targetLng });
                map.setZoom(18);

                setSelectedIdeaId(pin.id);
                setSelectedLocation({ lat: targetLat, lng: targetLng });
            }
        }
    }, [onSelectPinFromParent, map, groupedPins, selectedLocation]);

    return (
        <div className="w-full h-full relative" id="civic-map-container">
            {/* Analysis Pulse Overlay */}
            <AnimatePresence>
                {isAnalysisMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
                    >
                        <motion.div
                            animate={{
                                boxShadow: [
                                    "inset 0 0 100px rgba(234, 179, 8, 0)",
                                    "inset 0 0 150px rgba(234, 179, 8, 0.15)",
                                    "inset 0 0 100px rgba(234, 179, 8, 0)"
                                ]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0"
                        />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent animate-pulse" />
                    </motion.div>
                )}
            </AnimatePresence>

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
                                <div className="bg-white/10 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center border border-white/20 shadow-xl transition-colors group-hover:bg-purple-600/20">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-500 to-blue-500">
                                        <Flag className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <div className="w-0.5 h-3 bg-gradient-to-b shadow-sm from-purple-500 to-transparent" />
                                <div className="w-3 h-1 bg-black/40 rounded-full blur-[1px] -mt-0.5" />
                            </motion.div>

                            {hoveredPinId === group.mainPinId && group.ideas[0].saturationIndex !== null && (
                                <motion.div
                                    key={`tooltip-${group.mainPinId}`}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`absolute bottom-14 bg-black/60 backdrop-blur-xl rounded-[28px] p-2.5 text-xs font-semibold text-white border shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 pointer-events-none min-w-[200px] ${isAnalysisMode ? 'border-yellow-500/30' : 'border-white/20'}`}
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
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </AdvancedMarker>
                ))}

                {isAnalyzing && analysisLocation && (
                    <AnalysisCircle center={analysisLocation} radius={10000} />
                )}

                {pendingPin && (
                    <AdvancedMarker position={pendingPin} zIndex={50}>
                        <motion.div
                            initial={{ scale: 0, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className={`bg-black/80 backdrop-blur-xl border rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3 min-w-[200px] pointer-events-auto transition-all ${isAnalysisMode ? 'border-yellow-500/50 shadow-yellow-500/10' : 'border-purple-500/50'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${isAnalysisMode ? 'bg-yellow-400' : 'bg-purple-400'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isAnalysisMode ? 'text-yellow-300' : 'text-purple-300'}`}>
                                    {isAnalysisMode ? 'Analysis Pulse' : 'Agent Detected'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-bold leading-tight line-clamp-2">
                                    {selectedPlaceName || "New Opportunity"}
                                </span>
                                <span className="text-white/40 text-[9px] mt-0.5">
                                    {isAnalysisMode ? 'Deep site evaluation ready' : 'Ready for urban simulation?'}
                                </span>
                            </div>
                            <div className="flex w-full mt-1">
                                <button
                                    disabled={selectedPlaceName === "Detecting location..."}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isAnalysisMode && onRunAnalysis) {
                                            const nearbyPins = pins.filter(p => {
                                                const dist = getDistanceFromLatLonInKm(pendingPin.lat, pendingPin.lng, p.lat, p.lng);
                                                return dist <= 10;
                                            });
                                            const placeToPass = selectedPlaceName || "New Opportunity";
                                            onRunAnalysis(pendingPin, nearbyPins, placeToPass);
                                        } else {
                                            setTempPin(pendingPin);
                                        }
                                        setPendingPin(null);
                                    }}
                                    className={`w-full text-white text-[10px] font-black py-2.5 rounded-xl transition-all shadow-lg uppercase tracking-widest border border-white/10 ${selectedPlaceName === "Detecting location..." ? 'opacity-50 cursor-not-allowed bg-gray-600' : isAnalysisMode ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'}`}
                                >
                                    {selectedPlaceName === "Detecting location..." ? 'Loading...' : isAnalysisMode ? 'Run Deep Scan' : 'Confirm Spot'}
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
                            className={`${isAnalysisMode ? 'bg-yellow-500' : 'bg-blue-500'} rounded-full w-8 h-8 flex items-center justify-center border-2 border-white/50 animate-pulse`}
                        >
                            <Pin background={isAnalysisMode ? '#eab308' : '#3b82f6'} glyphColor={'#ffffff'} borderColor={'transparent'} />
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
                            className="group relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 ring-4 ring-black/20 bg-gradient-to-br from-purple-600 to-blue-600"
                        >
                            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Bot className="w-6 h-6 text-white" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>


            <SidePanel
                isOpen={!!tempPin}
                location={tempPin}
                onCancel={handleCancel}
                onSuccess={handlePinCreated}
                onAiAction={handleAiResponse}
                placeName={selectedPlaceName}
                refiningIdea={refiningIdea}
            />

            <AnimatePresence>
                {selectedLocation && (
                    <IdeaGallery
                        isOpen={true}
                        onClose={() => {
                            setSelectedLocation(null);
                            setSelectedIdeaId(null);
                            onGalleryClose?.();
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
                )}
            </AnimatePresence>
        </div>
    );
}

// Custom component to render a Google Maps Circle
function AnalysisCircle({ center, radius }: { center: { lat: number, lng: number }, radius: number }) {
    const map = useMap('main-map');
    const [circle, setCircle] = useState<google.maps.Circle | null>(null);

    useEffect(() => {
        if (!map) return;

        const newCircle = new google.maps.Circle({
            strokeColor: '#eab308',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#eab308',
            fillOpacity: 0.15,
            map,
            center,
            radius,
            clickable: false,
            zIndex: 10
        });

        setCircle(newCircle);

        // Optional pulse effect by slowly transitioning the radius and opacity
        let animationFrame: number;
        let p = 0;
        const animate = () => {
            p += 0.05;
            const extraRadius = Math.sin(p) * 200; // pulse by +/- 200m
            const opacity = 0.15 + (Math.sin(p) * 0.05);
            newCircle.setRadius(radius + extraRadius);
            newCircle.setOptions({ fillOpacity: opacity });
            animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrame);
            newCircle.setMap(null);
        };
    }, [map, center, radius]);

    return null;
}

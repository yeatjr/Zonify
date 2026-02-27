'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RenovationPin } from './Map';
import { Bot, MapPin } from 'lucide-react';
import { getImageSrc } from '@/lib/utils';

interface VisionGalleryProps {
    pins: RenovationPin[];
    onSelectPin: (pin: RenovationPin) => void;
}

export default function VisionGallery({ pins, onSelectPin }: VisionGalleryProps) {
    const visionPins = pins.filter(p => p.visionImage).sort((a, b) => b.id.localeCompare(a.id));

    if (visionPins.length === 0) return null;

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-10">
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar no-scrollbar scroll-smooth">
                {visionPins.map((pin) => (
                    <motion.button
                        key={pin.id}
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectPin(pin)}
                        className="flex-shrink-0 w-48 h-32 relative rounded-2xl overflow-hidden border border-white/20 shadow-xl group bg-black"
                    >
                        <img
                            src={getImageSrc(pin.visionImage)}
                            alt={pin.businessType}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                        <div className="absolute bottom-3 left-3 right-3 text-left">
                            <div className="text-xs font-bold text-white truncate drop-shadow-md">
                                {pin.businessType}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[8px] text-gray-300 font-medium">
                                <MapPin className="w-2 h-2" />
                                <span>Recent Vision</span>
                            </div>
                        </div>

                        <div className="absolute top-2 right-2 bg-purple-600/80 backdrop-blur-md p-1 rounded-lg border border-purple-400/30">
                            <Bot className="w-3 h-3 text-white" />
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

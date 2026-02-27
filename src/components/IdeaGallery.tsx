'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ThumbsUp, User, Bot, MapPin, Activity, Image as ImageIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { getImageSrc } from '@/lib/utils';

interface Idea {
    id: string;
    lat: number;
    lng: number;
    businessType: string;
    review: string;
    author?: string;
    agreementCount?: number;
    saturationIndex: number | null;
    visionImage?: string;
    streetViewUrl?: string;
    satelliteUrl?: string;
    parentIdeaId?: string;
}

interface IdeaGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    location: { lat: number; lng: number } | null;
    ideas: Idea[];
    onIdeaUpdated: () => void;
    onAddDetails?: (idea: Idea) => void;
    initialIdeaId?: string | null;
}

export default function IdeaGallery({ isOpen, onClose, location, ideas, onIdeaUpdated, onAddDetails, initialIdeaId }: IdeaGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [upvotingIdeaId, setUpvotingIdeaId] = useState<string | null>(null);
    const { user, loginWithGoogle } = useAuth();

    // Sort ideas by agreementCount descending
    const sortedIdeas = [...ideas].sort((a, b) => (b.agreementCount || 0) - (a.agreementCount || 0));
    const mainIdeas = sortedIdeas.filter(i => !i.parentIdeaId);

    // Initial navigation effect
    React.useEffect(() => {
        if (isOpen && initialIdeaId) {
            // Find if the target idea is a main idea or belongs to one
            const targetIdea = sortedIdeas.find(i => i.id === initialIdeaId);
            if (targetIdea) {
                // If it's a child, we want its parent's index
                const parentId = targetIdea.parentIdeaId || targetIdea.id;
                const parentIndex = mainIdeas.findIndex(i => i.id === parentId);
                if (parentIndex !== -1) {
                    setCurrentIndex(parentIndex);
                }
            }
        }
    }, [isOpen, initialIdeaId, mainIdeas.length]);

    // Safety check
    if (!isOpen || mainIdeas.length === 0) return null;

    const currentIdea = mainIdeas[currentIndex] || mainIdeas[0];
    const refinementIdeas = sortedIdeas.filter(i => i.parentIdeaId === currentIdea.id);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % mainIdeas.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + mainIdeas.length) % mainIdeas.length);
    };

    const handleAgree = async (ideaId: string) => {
        if (!user) {
            loginWithGoogle();
            return;
        }

        if (upvotingIdeaId) return; // Prevent double-clicks

        setUpvotingIdeaId(ideaId);
        try {
            const ideaRef = doc(db, 'pins', ideaId);
            await updateDoc(ideaRef, {
                agreementCount: increment(1)
            });
            onIdeaUpdated();
        } catch (error) {
            console.error("Error upvoting idea:", error);
        } finally {
            setUpvotingIdeaId(null);
        }
    };

    return (
        <AnimatePresence>
            <div className="absolute inset-0 pointer-events-none z-[60] p-4">
                {/* Backdrop overlay */}
                <motion.div
                    key="gallery-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                />

                {/* Floating Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="absolute z-[60] left-[60%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl pointer-events-auto flex flex-col"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 mb-4 bg-black/80 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white font-outfit uppercase tracking-widest">
                                    Community Planning
                                </h2>
                                <p className="text-[10px] text-white/40 font-bold">
                                    {mainIdeas.length} {mainIdeas.length === 1 ? 'Proposed Vision' : 'Visions'} at this coordinates
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {mainIdeas.length > 1 && (
                                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                                    <button onClick={handlePrev} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-[10px] font-black text-white/90">{currentIndex + 1} / {mainIdeas.length}</span>
                                    <button onClick={handleNext} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                                <X className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                            </button>
                        </div>
                    </div>

                    {/* Content Row: Original Card + Refinement Cards */}
                    <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-8 px-2 -mx-2 items-start">
                        {/* 1. The Original Proposal Card */}
                        <motion.div
                            key={`main-${currentIdea.id}`}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="min-w-[340px] w-[340px] bg-black/80 backdrop-blur-3xl border border-white/20 rounded-[32px] shadow-[0_25px_80px_rgba(0,0,0,0.6)] p-6 shrink-0"
                        >
                            <div className="flex flex-col gap-5">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Initial Proposal</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight">{currentIdea.businessType}</h3>
                                    <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase">
                                        <User className="w-3 h-3" />
                                        {currentIdea.author || 'Anonymous'}
                                    </div>
                                </div>

                                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
                                    {currentIdea.visionImage ? (
                                        <img src={getImageSrc(currentIdea.visionImage)} alt="Vision" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-10 h-10 text-white/5" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-purple-600/90 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white border border-white/20">
                                        RENDER v1
                                    </div>
                                </div>

                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                                    <p className="text-[13px] text-gray-300 italic">"{currentIdea.review}"</p>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        onClick={() => handleAgree(currentIdea.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black text-white transition-all border border-white/10"
                                    >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        AGREE ({currentIdea.agreementCount || 0})
                                    </button>
                                    {onAddDetails && (
                                        <button
                                            onClick={() => onAddDetails(currentIdea)}
                                            className="px-4 py-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl text-[10px] font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-wider border border-white/20"
                                        >
                                            Refine
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. Refinement Evolutions */}
                        {refinementIdeas.map((child, idx) => (
                            <motion.div
                                key={`refinement-${child.id}`}
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: (idx + 1) * 0.1 }}
                                className="min-w-[300px] w-[300px] bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-5 shrink-0"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-1.5 pr-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Evolution {idx + 1}</span>
                                        </div>
                                        <div className="text-[8px] font-bold text-white/20 uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                            {child.businessType}
                                        </div>
                                    </div>

                                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 bg-black/40">
                                        {child.visionImage && (
                                            <img src={getImageSrc(child.visionImage)} alt="Evolution" className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                    </div>

                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
                                            <User className="w-2.5 h-2.5 text-purple-300" />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 truncate">{child.author || 'Anonymous'}</span>
                                    </div>

                                    <div className="max-h-32 overflow-y-auto custom-scrollbar bg-white/[0.02] p-3 rounded-xl">
                                        <p className="text-[12px] text-gray-400 leading-relaxed italic">
                                            "{child.review}"
                                        </p>
                                    </div>

                                    <div className="mt-auto border-t border-white/5 pt-4">
                                        <button
                                            onClick={() => handleAgree(child.id)}
                                            className="flex items-center gap-2 text-[9px] font-black text-white/20 hover:text-blue-400 transition-colors"
                                        >
                                            <ThumbsUp className="w-3 h-3" />
                                            SUPPORT ({child.agreementCount || 0})
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Placeholder for "No Refinements yet" if applicable */}
                        {refinementIdeas.length === 0 && (
                            <div className="min-w-[300px] h-[400px] rounded-[28px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center opacity-20 px-8 text-center grayscale">
                                <Bot className="w-10 h-10 mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Waiting for community evolutions</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

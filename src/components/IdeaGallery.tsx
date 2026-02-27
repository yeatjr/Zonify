'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ThumbsUp, User, Bot, Trash2, MapPin, Activity, Image as ImageIcon, History } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
    userId?: string;
    flags?: string[];
    createdAt?: any;
    agreedUsers?: string[];
    analysis?: {
        envAnalysis: string | null;
        satelliteAnalysis: string | null;
    } | null;
}

interface IdeaGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    location: { lat: number; lng: number } | null;
    ideas: Idea[];
    onIdeaUpdated: () => void;
    onAddDetails?: (idea: Idea) => void;
    onAddNewIdea?: () => void;
    initialIdeaId?: string | null;
}

export default function IdeaGallery({ isOpen, onClose, location, ideas, onIdeaUpdated, onAddDetails, onAddNewIdea, initialIdeaId }: IdeaGalleryProps) {
    const [pageIndex, setPageIndex] = useState(0);
    const [viewingEvolutionsForId, setViewingEvolutionsForId] = useState<string | null>(null);
    const [selectedEvolutionIndices, setSelectedEvolutionIndices] = useState<Record<string, number>>({});
    const [upvotingIdeaId, setUpvotingIdeaId] = useState<string | null>(null);
    const { user, loginWithGoogle } = useAuth();
    const itemsPerPage = 3;

    // Sort ideas by agreementCount descending
    const sortedIdeas = [...ideas].sort((a, b) => (b.agreementCount || 0) - (a.agreementCount || 0));
    const mainIdeas = sortedIdeas.filter(i => !i.parentIdeaId);
    const totalPages = Math.ceil(mainIdeas.length / itemsPerPage);

    // Initial navigation effect
    React.useEffect(() => {
        if (isOpen && initialIdeaId) {
            const targetIdea = sortedIdeas.find(i => i.id === initialIdeaId);
            if (targetIdea) {
                const parentId = targetIdea.parentIdeaId || targetIdea.id;
                setViewingEvolutionsForId(parentId);
                const parentIndex = mainIdeas.findIndex(i => i.id === parentId);
                if (parentIndex !== -1) {
                    setPageIndex(Math.floor(parentIndex / itemsPerPage));
                }
            }
        } else if (isOpen) {
            // Reset state when opening a new pin
            setViewingEvolutionsForId(null);
            setPageIndex(0);
        }
    }, [isOpen, initialIdeaId, mainIdeas.length]);

    // Safety check
    if (!isOpen || mainIdeas.length === 0) return null;

    const handleNext = () => setPageIndex(p => Math.min(totalPages - 1, p + 1));
    const handlePrev = () => setPageIndex(p => Math.max(0, p - 1));

    const handleAgree = async (ideaId: string) => {
        if (!user) {
            loginWithGoogle();
            return;
        }

        if (upvotingIdeaId) return;
        const targetIdea = ideas.find(i => i.id === ideaId);

        setUpvotingIdeaId(ideaId);
        try {
            const ideaRef = doc(db, 'pins', ideaId);
            if (targetIdea?.agreedUsers?.includes(user.uid)) {
                // Toggle OFF
                await updateDoc(ideaRef, {
                    agreementCount: increment(-1),
                    agreedUsers: arrayRemove(user.uid)
                });
            } else {
                // Toggle ON
                await updateDoc(ideaRef, {
                    agreementCount: increment(1),
                    agreedUsers: arrayUnion(user.uid)
                });
            }
            onIdeaUpdated();
        } catch (error) {
            console.error("Error toggling vote:", error);
        } finally {
            setUpvotingIdeaId(null);
        }
    };

    const handleDelete = async (ideaId: string) => {
        if (!window.confirm("Are you sure you want to delete your proposal entirely?")) return;
        try {
            await deleteDoc(doc(db, 'pins', ideaId));
            onIdeaUpdated();
            if (sortedIdeas.length <= 1) {
                onClose();
            } else {
                setViewingEvolutionsForId(null);
                setPageIndex(0);
            }
        } catch (error) {
            console.error("Error deleting idea:", error);
        }
    };

    const activeMainIdeas = viewingEvolutionsForId
        ? [mainIdeas.find(i => i.id === viewingEvolutionsForId)!].filter(Boolean)
        : mainIdeas.slice(pageIndex * itemsPerPage, pageIndex * itemsPerPage + itemsPerPage);

    return (
        <AnimatePresence>
            <div className="absolute inset-0 pointer-events-none z-[120] p-4">
                {/* Backdrop overlay */}
                <motion.div
                    key="gallery-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-md pointer-events-auto"
                />

                {/* Floating Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 0.95, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 20 }}
                    className="absolute z-[130] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl pointer-events-auto flex flex-col origin-center"
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
                            {viewingEvolutionsForId ? (
                                <button
                                    onClick={() => setViewingEvolutionsForId(null)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black text-white uppercase transition-all border border-white/20"
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                    Back to Grid
                                </button>
                            ) : (
                                <>
                                    {onAddNewIdea && (
                                        <button
                                            onClick={onAddNewIdea}
                                            className="hidden sm:flex px-3 py-1.5 bg-gradient-to-r from-purple-600/50 to-blue-600/50 hover:from-purple-500 hover:to-blue-500 rounded-lg text-[10px] font-black text-white transition-all border border-white/20 uppercase tracking-widest items-center gap-2"
                                        >
                                            <MapPin className="w-3 h-3" />
                                            New Idea Here
                                        </button>
                                    )}
                                    {totalPages > 1 && (
                                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                                            <button
                                                onClick={handlePrev}
                                                disabled={pageIndex === 0}
                                                className="p-1 hover:bg-white/10 disabled:opacity-30 rounded-lg transition-colors text-white/60 hover:text-white"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-[10px] font-black text-white/90">{pageIndex + 1} / {totalPages}</span>
                                            <button
                                                onClick={handleNext}
                                                disabled={pageIndex === totalPages - 1}
                                                className="p-1 hover:bg-white/10 disabled:opacity-30 rounded-lg transition-colors text-white/60 hover:text-white"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                                <X className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                            </button>
                        </div>
                    </div>

                    {/* Content Row: Grid View or Version History Focus */}
                    <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-8 px-2 -mx-2 items-start transition-all duration-500">
                        {activeMainIdeas.map(currentIdea => {
                            const refinementIdeas = sortedIdeas.filter(i => i.parentIdeaId === currentIdea.id);
                            const sortedRefinements = [...refinementIdeas].sort((a, b) => {
                                const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
                                const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
                                return timeA - timeB;
                            });

                            const allEvolutions = [currentIdea, ...sortedRefinements];

                            // 1. Find the latest evolution by the ORIGINAL AUTHOR to pin as the Main Card
                            const authorRefinements = allEvolutions.filter(r =>
                                (r.userId && currentIdea.userId && r.userId === currentIdea.userId) ||
                                (r.author && currentIdea.author && r.author === currentIdea.author)
                            );

                            const latestIdea = authorRefinements.length > 0
                                ? authorRefinements[authorRefinements.length - 1]
                                : currentIdea;

                            const displayIdeaIndex = allEvolutions.findIndex(i => i.id === latestIdea.id);

                            // 2. Everything else (old author proposals + community forks) goes to the history board
                            const historyIdeas = allEvolutions.filter(i => i.id !== latestIdea.id);
                            const totalEvolutions = allEvolutions.length;
                            const isLatestOwner = !!(user && (latestIdea.userId === user.uid || latestIdea.author === user.displayName));

                            return (
                                <React.Fragment key={currentIdea.id}>
                                    {/* The Latest Evolution Card */}
                                    <motion.div
                                        key={`main-${latestIdea.id}`}
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        className="min-w-[340px] w-[340px] bg-black/80 backdrop-blur-3xl border border-white/20 rounded-[32px] shadow-[0_25px_80px_rgba(0,0,0,0.6)] p-6 shrink-0 z-10"
                                    >
                                        <div className="flex flex-col gap-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 mb-1 justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">
                                                            {displayIdeaIndex === 0 ? "Initial Proposal" : `Evolution ${displayIdeaIndex}`}
                                                        </span>
                                                    </div>

                                                    {historyIdeas.length > 0 && !viewingEvolutionsForId && (
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => setViewingEvolutionsForId(currentIdea.id)}
                                                                className="flex items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                                title="View Community Evolutions"
                                                            >
                                                                <History className="w-3.5 h-3.5" />
                                                            </button>

                                                            <button
                                                                onClick={() => setViewingEvolutionsForId(currentIdea.id)}
                                                                className="flex items-center px-2 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-purple-500/20 transition-all shadow-sm"
                                                            >
                                                                {historyIdeas.length} Community {historyIdeas.length === 1 ? 'Branch' : 'Branches'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className="text-2xl font-black text-white leading-tight tracking-tight">{latestIdea.businessType}</h3>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase">
                                                        <User className="w-3 h-3" />
                                                        {latestIdea.author || 'Anonymous'}
                                                    </div>
                                                    {latestIdea.id !== currentIdea.id && latestIdea.author !== currentIdea.author && (
                                                        <div className="text-[9px] text-purple-300/60 italic mt-0.5 ml-5">
                                                            Inspired by {currentIdea.author || 'Anonymous'}'s original vision
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
                                                {latestIdea.visionImage ? (
                                                    <img src={getImageSrc(latestIdea.visionImage)} alt="Vision" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon className="w-10 h-10 text-white/5" />
                                                    </div>
                                                )}
                                                <div className="absolute top-3 right-3 bg-purple-600/90 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white border border-white/20">
                                                    {displayIdeaIndex === 0 ? "RENDER v1" : `RENDER v${displayIdeaIndex + 1}`}
                                                </div>
                                            </div>

                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 leading-relaxed h-[130px] overflow-y-auto custom-scrollbar">
                                                <p className="text-[13px] text-gray-300 italic">"{latestIdea.review}"</p>
                                            </div>

                                            {/* Analysis Section - Added back */}
                                            {(latestIdea.analysis?.envAnalysis || latestIdea.analysis?.satelliteAnalysis) && (
                                                <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 space-y-3">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-purple-300 uppercase tracking-widest">
                                                        <Activity className="w-3.5 h-3.5" />
                                                        Site Analysis
                                                    </div>
                                                    <div className="space-y-2">
                                                        {latestIdea.analysis.envAnalysis && (
                                                            <div className="text-[11px] text-gray-400 leading-relaxed">
                                                                <span className="text-purple-300/60 font-bold uppercase text-[9px] block mb-0.5">Street Vision:</span>
                                                                {latestIdea.analysis.envAnalysis}
                                                            </div>
                                                        )}
                                                        {latestIdea.analysis.satelliteAnalysis && (
                                                            <div className="text-[11px] text-gray-400 leading-relaxed">
                                                                <span className="text-blue-300/60 font-bold uppercase text-[9px] block mb-0.5">Satellite Context:</span>
                                                                {latestIdea.analysis.satelliteAnalysis}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between gap-3">
                                                {isLatestOwner ? (
                                                    <div
                                                        title="You cannot vote on your own proposal"
                                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 rounded-xl text-[10px] font-black text-white/30 border border-white/5 cursor-not-allowed uppercase tracking-wider"
                                                    >
                                                        <ThumbsUp className="w-3.5 h-3.5" />
                                                        AGREE ({latestIdea.agreementCount || 0})
                                                    </div>
                                                ) : user && latestIdea.agreedUsers?.includes(user.uid) ? (
                                                    <button
                                                        onClick={() => handleAgree(latestIdea.id)}
                                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl text-[10px] font-black text-purple-300 transition-all border border-purple-500/30 uppercase tracking-wider"
                                                    >
                                                        <ThumbsUp className="w-3.5 h-3.5" />
                                                        AGREED ({latestIdea.agreementCount || 0})
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAgree(latestIdea.id)}
                                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black text-white transition-all border border-white/10 uppercase tracking-wider"
                                                    >
                                                        <ThumbsUp className="w-3.5 h-3.5" />
                                                        AGREE ({latestIdea.agreementCount || 0})
                                                    </button>
                                                )}
                                                {onAddDetails && (
                                                    <button
                                                        onClick={() => onAddDetails(latestIdea)}
                                                        className="px-4 py-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl text-[10px] font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-wider border border-white/20"
                                                    >
                                                        Refine
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 justify-between">
                                                {latestIdea.saturationIndex && (
                                                    <div className={`text-[10px] px-3 py-2 rounded-xl font-black shadow-inner flex-1 text-center ${latestIdea.saturationIndex >= 85 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                        SCORE: {Math.round(latestIdea.saturationIndex)}/100
                                                    </div>
                                                )}
                                                {isLatestOwner && (
                                                    <button
                                                        onClick={() => handleDelete(latestIdea.id)}
                                                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-all border border-red-500/20"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        DELETE
                                                    </button>
                                                )}
                                            </div>
                                            {latestIdea.flags && latestIdea.flags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 mt-2">
                                                    <span className="text-[10px] text-red-400/80 font-bold uppercase tracking-wider py-1 mr-1">Risks: </span>
                                                    {latestIdea.flags.map((flag: string, idx: number) => (
                                                        <span key={idx} className="bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors text-[9px] uppercase font-bold px-2 py-1 rounded-md tracking-wider">
                                                            {flag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>

                                    {/* 2. Version History Evolutions */}
                                    <AnimatePresence>
                                        {viewingEvolutionsForId === currentIdea.id && historyIdeas.map((child, idx) => {
                                            const childIndex = allEvolutions.findIndex(i => i.id === child.id);
                                            const isChildOwner = !!(user && (child.userId === user.uid || child.author === user.displayName));
                                            return (
                                                <motion.div
                                                    key={`history-${child.id}`}
                                                    initial={{ x: -20, opacity: 0, width: 0 }}
                                                    animate={{ x: 0, opacity: 1, width: 300 }}
                                                    exit={{ x: -20, opacity: 0, width: 0 }}
                                                    transition={{ duration: 0.3, delay: (historyIdeas.length - 1 - idx) * 0.05 }}
                                                    className="min-w-[300px] w-[300px] bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-5 shrink-0 hover:bg-black/80 transition-colors overflow-hidden flex flex-col"
                                                >
                                                    <div className="flex flex-col gap-4 flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-1.5 pr-2 opacity-60">
                                                                <History className="w-3 h-3 text-gray-400" />
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                    {childIndex === 0 ? "Initial Proposal" : `Evolution ${childIndex}`}
                                                                </span>
                                                            </div>
                                                            <div className="text-[8px] font-bold text-white/20 uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                                {child.businessType}
                                                            </div>
                                                        </div>

                                                        <div className="relative aspect-[4/3] w-full min-h-[120px] max-h-[160px] flex-shrink rounded-2xl overflow-hidden border border-white/5 bg-black/40 grayscale hover:grayscale-0 transition-all duration-300">
                                                            {child.visionImage && (
                                                                <img src={getImageSrc(child.visionImage)} alt="Evolution" className="w-full h-full object-cover" />
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                                        </div>

                                                        <div className="flex items-center gap-2 px-1">
                                                            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
                                                                <User className="w-2.5 h-2.5 text-purple-300" />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-400 truncate">{child.author || 'Anonymous'}</span>
                                                        </div>

                                                        <div className="max-h-32 overflow-y-auto custom-scrollbar bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                                            <p className="text-[12px] text-gray-500 leading-relaxed italic">
                                                                "{child.review}"
                                                            </p>
                                                        </div>

                                                        <div className="mt-auto border-t border-white/5 pt-4">
                                                            {isChildOwner ? (
                                                                <div
                                                                    title="You cannot vote on your own proposal"
                                                                    className="flex items-center justify-center gap-2 text-[9px] font-black text-white/10 cursor-not-allowed"
                                                                >
                                                                    <ThumbsUp className="w-3 h-3" />
                                                                    AGREE ({child.agreementCount || 0})
                                                                </div>
                                                            ) : user && child.agreedUsers?.includes(user.uid) ? (
                                                                <button
                                                                    onClick={() => handleAgree(child.id)}
                                                                    className="flex items-center justify-center gap-2 text-[9px] font-black text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors bg-purple-500/10 border border-purple-500/20 w-full py-2 rounded-lg uppercase"
                                                                >
                                                                    <ThumbsUp className="w-3 h-3" />
                                                                    AGREED ({child.agreementCount || 0})
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleAgree(child.id)}
                                                                    className="flex items-center justify-center gap-2 text-[9px] font-black text-white/40 hover:text-purple-400 transition-colors bg-white/5 hover:bg-white/10 w-full py-2 rounded-lg uppercase"
                                                                >
                                                                    <ThumbsUp className="w-3 h-3" />
                                                                    AGREE ({child.agreementCount || 0})
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </React.Fragment>
                            )
                        })}

                        {/* Placeholder for "No Refinements yet" if reading evolutions */}
                        {viewingEvolutionsForId && activeMainIdeas.length === 1 && sortedIdeas.filter(i => i.parentIdeaId === activeMainIdeas[0].id).length === 0 && (
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

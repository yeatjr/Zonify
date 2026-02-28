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

type ExpandedView = {
    baseIdeaId: string;
    mode: 'HISTORY' | 'BRANCHES';
    expandedBranchKey: string | null;
} | null;

export default function IdeaGallery({ isOpen, onClose, location, ideas, onIdeaUpdated, onAddDetails, onAddNewIdea, initialIdeaId }: IdeaGalleryProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [expandedView, setExpandedView] = useState<ExpandedView>(null);
    const [upvotingIdeaId, setUpvotingIdeaId] = useState<string | null>(null);
    const { user, loginWithGoogle } = useAuth();

    // Sort ideas by agreementCount descending
    const sortedIdeas = [...ideas].sort((a, b) => (b.agreementCount || 0) - (a.agreementCount || 0));
    const mainIdeas = sortedIdeas.filter(i => !i.parentIdeaId);
    React.useEffect(() => {
        if (isOpen && initialIdeaId && ideas.length > 0) {
            const idea = ideas.find(i => i.id === initialIdeaId);
            if (idea) {
                const baseId = idea.parentIdeaId || idea.id;
                setExpandedView({ baseIdeaId: baseId, mode: 'BRANCHES', expandedBranchKey: null });
            }
        } else if (isOpen) {
            // Reset state when opening a new pin
            setExpandedView(null);
            setUpvotingIdeaId(null);
        }
    }, [isOpen, initialIdeaId, mainIdeas.length]);

    // Safety check
    if (mainIdeas.length === 0) return null;

    const handleNext = () => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    };

    const handlePrev = () => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    };

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
                setExpandedView(null);
            }
        } catch (error) {
            console.error("Error deleting idea:", error);
        }
    };

    const activeMainIdeas = expandedView
        ? [mainIdeas.find(i => i.id === expandedView.baseIdeaId)!].filter(Boolean)
        : mainIdeas;

    return (
        <div className="absolute inset-0 pointer-events-none z-[500] p-4">
            {/* Backdrop overlay */}
            <motion.div
                key="gallery-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute inset-0 bg-black/60 backdrop-blur-xl pointer-events-auto"
            />



                {/* Floating Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 0.95, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 20 }}
                    className="absolute z-[130] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl pointer-events-auto flex flex-col origin-center"
                >
                    {/* Floating Navigation Arrows */}
                    {mainIdeas.length > 1 && (
                        <>
                            <motion.button
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onClick={handlePrev}
                                className="absolute -left-20 top-1/2 -translate-y-1/2 z-[140] p-4 bg-black/60 hover:bg-black/90 backdrop-blur-xl border border-white/20 rounded-full text-white/60 hover:text-white transition-all shadow-[0_0_40px_rgba(0,0,0,0.5)] pointer-events-auto group hidden xl:flex"
                            >
                                <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform duration-300" />
                            </motion.button>
                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onClick={handleNext}
                                className="absolute -right-20 top-1/2 -translate-y-1/2 z-[140] p-4 bg-black/60 hover:bg-black/90 backdrop-blur-xl border border-white/20 rounded-full text-white/60 hover:text-white transition-all shadow-[0_0_40px_rgba(0,0,0,0.5)] pointer-events-auto group hidden xl:flex"
                            >
                                <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform duration-300" />
                            </motion.button>
                        </>
                    )}
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
                            {expandedView ? (
                                <button
                                    onClick={() => {
                                        if (expandedView.expandedBranchKey) {
                                            setExpandedView({ ...expandedView, expandedBranchKey: null });
                                        } else {
                                            setExpandedView(null);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black text-white uppercase transition-all border border-white/20"
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                    {expandedView.expandedBranchKey ? 'Back to Branches' : 'Back to Grid'}
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
                                </>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors group relative z-50 pointer-events-auto"
                            >
                                <X className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                            </button>
                        </div>
                    </div>

                    {/* Content Row: Grid View or Version History Focus */}
                    <div
                        ref={scrollRef}
                        style={{ maskImage: 'linear-gradient(to right, transparent, black 1%, black 99%, transparent)' }}
                        className="flex gap-6 overflow-x-auto pb-8 px-2 -mx-2 items-start transition-all duration-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        {activeMainIdeas.map(currentIdea => {
                            const getDescendants = (rootId: string, all: Idea[]) => {
                                const result: Idea[] = [];
                                let currentLevel = all.filter(i => i.parentIdeaId === rootId);
                                while (currentLevel.length > 0) {
                                    result.push(...currentLevel);
                                    let nextLevel: Idea[] = [];
                                    currentLevel.forEach(c => nextLevel.push(...all.filter(i => i.parentIdeaId === c.id)));
                                    currentLevel = nextLevel;
                                }
                                return result;
                            };

                            const treeIdeas = [currentIdea, ...getDescendants(currentIdea.id, sortedIdeas)].sort((a, b) => {
                                const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
                                const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
                                return timeA - timeB;
                            });

                            const authorGroups = new Map<string, Idea[]>();
                            treeIdeas.forEach(idea => {
                                const authorKey = idea.userId || idea.author || 'Anonymous';
                                if (!authorGroups.has(authorKey)) authorGroups.set(authorKey, []);
                                authorGroups.get(authorKey)!.push(idea);
                            });

                            const mainAuthorKey = currentIdea.userId || currentIdea.author || 'Anonymous';
                            const mainAuthorEvolutions = authorGroups.get(mainAuthorKey) || [currentIdea];

                            const latestIdea = mainAuthorEvolutions[mainAuthorEvolutions.length - 1];
                            const mainHistoryIdeas = mainAuthorEvolutions.slice(0, -1).reverse();

                            const communityBranches = Array.from(authorGroups.entries())
                                .filter(([key, _]) => key !== mainAuthorKey)
                                .map(([key, evols]) => ({
                                    authorKey: key,
                                    latestIdea: evols[evols.length - 1],
                                    historyIdeas: evols.slice(0, -1).reverse()
                                }));

                            const isLatestOwner = !!(user && (latestIdea.userId === user.uid || latestIdea.author === user.displayName));

                            return (
                                <React.Fragment key={currentIdea.id}>
                                    {/* The Latest Evolution Card */}
                                    <motion.div
                                        key={`main-${latestIdea.id}`}
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        className="min-w-[340px] w-[340px] flex flex-col bg-black/80 backdrop-blur-3xl border border-white/20 rounded-[32px] p-6 shrink-0 z-10"
                                    >
                                        <div className="flex flex-col gap-5 flex-1">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 mb-1 justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">
                                                            {mainAuthorEvolutions.length === 1 ? "Initial Proposal" : `Evolution ${mainAuthorEvolutions.length}`}
                                                        </span>
                                                    </div>

                                                    {!expandedView && (
                                                        <div className="flex items-center gap-1.5">
                                                            {mainHistoryIdeas.length > 0 && (
                                                                <button
                                                                    onClick={() => setExpandedView({ baseIdeaId: currentIdea.id, mode: 'HISTORY', expandedBranchKey: null })}
                                                                    className="flex items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                                    title="View Your Revision History"
                                                                >
                                                                    <History className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}

                                                            {communityBranches.length > 0 && (
                                                                <button
                                                                    onClick={() => setExpandedView({ baseIdeaId: currentIdea.id, mode: 'BRANCHES', expandedBranchKey: null })}
                                                                    className="flex items-center px-2 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-purple-500/20 transition-all shadow-sm"
                                                                >
                                                                    {communityBranches.length} Community {communityBranches.length === 1 ? 'Branch' : 'Branches'}
                                                                </button>
                                                            )}
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
                                                    {mainAuthorEvolutions.length === 1 ? "RENDER v1" : `RENDER v${mainAuthorEvolutions.length}`}
                                                </div>
                                            </div>

                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 leading-relaxed h-[130px] overflow-y-auto custom-scrollbar">
                                                <p className="text-[13px] text-gray-300 italic">"{latestIdea.review}"</p>
                                            </div>

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

                                    {/* 2. Version Histories & Community Branches */}
                                    <AnimatePresence>
                                        {/* A. RENDER MAIN HISTORY */}
                                        {expandedView?.baseIdeaId === currentIdea.id && expandedView.mode === 'HISTORY' && mainHistoryIdeas.map((child, idx) => {
                                            const isChildOwner = !!(user && (child.userId === user.uid || child.author === user.displayName));
                                            return (
                                                <motion.div
                                                    key={`history-${child.id}`}
                                                    initial={{ x: -20, opacity: 0, width: 0 }}
                                                    animate={{ x: 0, opacity: 1, width: 300 }}
                                                    exit={{ x: -20, opacity: 0, width: 0 }}
                                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                                    className="min-w-[300px] w-[300px] bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 shrink-0 hover:bg-black/80 transition-colors overflow-hidden flex flex-col"
                                                >
                                                    <div className="flex flex-col gap-4 flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-1.5 pr-2 opacity-60">
                                                                <History className="w-3 h-3 text-gray-400" />
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                    {idx === mainHistoryIdeas.length - 1 ? "Initial Proposal" : `Draft ${mainHistoryIdeas.length - idx}`}
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
                                                                    className="flex items-center justify-center gap-2 text-[9px] font-black text-white/10 cursor-not-allowed uppercase w-full py-2 rounded-lg"
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
                                                                    className="flex items-center justify-center gap-2 text-[9px] font-black text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 w-full py-2 rounded-lg uppercase"
                                                                >
                                                                    <ThumbsUp className="w-3 h-3" />
                                                                    AGREE ({child.agreementCount || 0})
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}

                                        {/* B. RENDER COMMUNITY BRANCHES + BRANCH HISTORY */}
                                        {expandedView?.baseIdeaId === currentIdea.id && expandedView.mode === 'BRANCHES' && communityBranches.map((branch, idx) => {
                                            if (expandedView.expandedBranchKey && expandedView.expandedBranchKey !== branch.authorKey) return null;

                                            const renderCardNode = (child: Idea, isBranchHead: boolean, subIdx: number) => {
                                                const isChildOwner = !!(user && (child.userId === user.uid || child.author === user.displayName));
                                                return (
                                                    <motion.div
                                                        key={`branch-${child.id}`}
                                                        initial={{ x: -20, opacity: 0, width: 0 }}
                                                        animate={{ x: 0, opacity: 1, width: isBranchHead ? 340 : 300 }}
                                                        exit={{ x: -20, opacity: 0, width: 0 }}
                                                        transition={{ duration: 0.3, delay: subIdx * 0.05 }}
                                                        className={`${isBranchHead ? "min-w-[340px] w-[340px] bg-gradient-to-b from-purple-900/40 to-black/60" : "min-w-[300px] w-[300px] bg-black/60 grayscale"} backdrop-blur-2xl border ${isBranchHead ? "border-purple-500/30" : "border-white/10"} rounded-[28px] p-5 shrink-0 hover:bg-black/80 hover:grayscale-0 transition-all overflow-hidden flex flex-col`}
                                                    >
                                                        <div className="flex flex-col gap-4 flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-1.5 pr-2 opacity-60">
                                                                    <div className={`w-2 h-2 rounded-full ${isBranchHead ? 'bg-purple-400 animate-pulse' : 'bg-gray-500'}`} />
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isBranchHead ? 'text-purple-400' : 'text-gray-400'}`}>
                                                                        {isBranchHead ? "Community Fork" : `Fork Draft ${branch.historyIdeas.length - subIdx}`}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isBranchHead && branch.historyIdeas.length > 0 && !expandedView.expandedBranchKey && (
                                                                        <button
                                                                            onClick={() => setExpandedView({ ...expandedView, expandedBranchKey: branch.authorKey })}
                                                                            className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-black text-white/60 transition-colors border border-white/10"
                                                                        >
                                                                            <History className="w-3 h-3" />
                                                                            {branch.historyIdeas.length} Edits
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <h3 className={`${isBranchHead ? 'text-xl' : 'text-sm'} font-black text-white leading-tight tracking-tight`}>{child.businessType}</h3>

                                                            <div className="relative aspect-[4/3] w-full min-h-[120px] max-h-[160px] flex-shrink rounded-2xl overflow-hidden border border-white/5 bg-black/40 transition-all duration-300">
                                                                {child.visionImage && (
                                                                    <img src={getImageSrc(child.visionImage)} alt="Evolution" className="w-full h-full object-cover" />
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                                            </div>

                                                            <div className="flex items-center gap-2 px-1">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isBranchHead ? 'bg-purple-500/20 border-purple-500/20' : 'bg-gray-500/20 border-gray-500/20'}`}>
                                                                    <User className={`w-2.5 h-2.5 ${isBranchHead ? 'text-purple-300' : 'text-gray-300'}`} />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-400 truncate">{child.author || 'Anonymous'}</span>
                                                            </div>

                                                            <div className="max-h-32 overflow-y-auto custom-scrollbar bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                                                <p className="text-[12px] text-gray-500 leading-relaxed italic">
                                                                    "{child.review}"
                                                                </p>
                                                            </div>

                                                            <div className="mt-auto border-t border-white/5 pt-4">
                                                                <div className="flex gap-2">
                                                                    {isChildOwner ? (
                                                                        <div
                                                                            title="You cannot vote on your own proposal"
                                                                            className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black text-white/10 cursor-not-allowed uppercase border border-white/5 py-2 rounded-lg"
                                                                        >
                                                                            <ThumbsUp className="w-3 h-3" />
                                                                            AGREE ({child.agreementCount || 0})
                                                                        </div>
                                                                    ) : user && child.agreedUsers?.includes(user.uid) ? (
                                                                        <button
                                                                            onClick={() => handleAgree(child.id)}
                                                                            className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors bg-purple-500/10 border border-purple-500/20 py-2 rounded-lg uppercase"
                                                                        >
                                                                            <ThumbsUp className="w-3 h-3" />
                                                                            AGREED ({child.agreementCount || 0})
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleAgree(child.id)}
                                                                            className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 py-2 rounded-lg uppercase"
                                                                        >
                                                                            <ThumbsUp className="w-3 h-3" />
                                                                            AGREE ({child.agreementCount || 0})
                                                                        </button>
                                                                    )}

                                                                    {isBranchHead && onAddDetails && (
                                                                        <button
                                                                            onClick={() => onAddDetails(child)}
                                                                            className="flex-1 py-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg text-[9px] font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-wider border border-white/20"
                                                                        >
                                                                            Refine
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )
                                            }

                                            return (
                                                <React.Fragment key={`branch-tree-${branch.authorKey}`}>
                                                    {renderCardNode(branch.latestIdea, true, idx)}
                                                    {expandedView.expandedBranchKey === branch.authorKey && branch.historyIdeas.map((h, hIdx) => renderCardNode(h, false, hIdx))}
                                                </React.Fragment>
                                            )
                                        })}
                                    </AnimatePresence>
                                </React.Fragment>
                            )
                        })}

                        {/* Placeholder for "No Refinements yet" if reading evolutions */}
                        {expandedView?.mode === 'BRANCHES' && activeMainIdeas.length === 1 && sortedIdeas.filter(i => i.parentIdeaId === activeMainIdeas[0].id).length === 0 && (
                            <div className="min-w-[300px] h-[400px] rounded-[28px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center opacity-20 px-8 text-center grayscale">
                                <Activity className="w-10 h-10 mb-4" />
                                <h4 className="text-xl font-black uppercase tracking-widest text-white mb-2">No Branches</h4>
                                <p className="text-sm font-bold text-gray-400">Be the first to propose a community fork!</p>
                            </div>
                        )}

                        {expandedView?.mode === 'HISTORY' && activeMainIdeas.length === 1 && sortedIdeas.filter(i => i.parentIdeaId === activeMainIdeas[0].id).length === 0 && (
                            <div className="min-w-[300px] h-[400px] rounded-[28px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center opacity-20 px-8 text-center grayscale">
                                <Activity className="w-10 h-10 mb-4" />
                                <h4 className="text-xl font-black uppercase tracking-widest text-white mb-2">Initial Draft</h4>
                                <p className="text-sm font-bold text-gray-400">This is the very first version of this idea.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
    );
}

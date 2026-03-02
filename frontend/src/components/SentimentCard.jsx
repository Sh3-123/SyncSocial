import React, { useState, useEffect } from 'react';
import { Smile, Frown, Meh, Loader2, Sparkles } from 'lucide-react';
import ProgressBar from './ProgressBar';

const SentimentCard = ({ sentimentData, loading, error, title = "Post Sentiment" }) => {

    if (loading) {
        return (
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                <ProgressBar className="min-h-0" />
                <p className="text-slate-400 text-sm animate-pulse mt-4">Analyzing with AI...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-[#121212] border border-red-500/10 rounded-2xl p-6 min-h-[160px] flex items-center justify-center">
                <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>
            </div>
        );
    }

    if (!sentimentData) return null;

    const { sentiment, emotion, confidence, breakdown } = sentimentData;

    const getSentimentConfig = (type) => {
        switch (type) {
            case 'positive':
                return {
                    icon: Smile,
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-400/10',
                    barColor: 'bg-emerald-400',
                    gradient: 'from-emerald-500/10 to-transparent'
                };
            case 'negative':
                return {
                    icon: Frown,
                    color: 'text-rose-400',
                    bg: 'bg-rose-400/10',
                    barColor: 'bg-rose-400',
                    gradient: 'from-rose-500/10 to-transparent'
                };
            default:
                return {
                    icon: Meh,
                    color: 'text-slate-400',
                    bg: 'bg-slate-400/10',
                    barColor: 'bg-slate-400',
                    gradient: 'from-slate-500/10 to-transparent'
                };
        }
    };

    const config = getSentimentConfig(sentiment);
    const Icon = config.icon;
    const scorePct = Math.round(confidence * 100);

    return (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50`} />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} className="text-indigo-400" />
                            {title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                            <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
                                <Icon size={24} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-white capitalize">
                                    {sentiment}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium">
                                    Primary emotion: <span className="text-slate-300 capitalize">{emotion}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-3xl font-black text-white">{scorePct}%</div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Confidence</div>
                    </div>
                </div>

                <div className="space-y-3 mt-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Emotion Breakdown (Top 6)</p>
                    {breakdown?.filter(item => !['neutral', 'positive', 'negative'].includes(item.label.toLowerCase())).slice(0, 6).map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300 capitalize font-medium">{item.label}</span>
                                <span className="text-slate-400 font-bold">{Math.round(item.score * 100)}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-1.5 rounded-full ${idx === 0 ? config.barColor : 'bg-white/20'}`}
                                    style={{ width: `${item.score * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SentimentCard;

import React, { useState } from 'react';
import { Sparkles, Loader2, Link as LinkIcon, TrendingUp, Presentation, Hash, MessageSquareText } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import ProgressBar from '../components/ProgressBar';

const RecommendationPage = () => {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }

        if (topic.length > 50) {
            setError('Topic must be 50 characters or less.');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetchWithAuth('/recommendation/trend-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.details || 'Failed to fetch trend recommendations');
            }

            setResult(data);
        } catch (err) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    AI Trend Intelligence
                </h1>
                <p className="mt-2 text-slate-400">
                    Enter a core topic below to generate real-time content ideas based on live search trends.
                </p>
            </div>

            {/* Input Section */}
            <div className="bg-[#121212] border border-white/10 rounded-xl p-6 mb-8 shadow-sm">
                <form onSubmit={handleGenerate}>
                    <div className="mb-4">
                        <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-2">
                            What is your core topic?
                        </label>
                        <input
                            type="text"
                            id="topic"
                            maxLength="50"
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="e.g., fitness, AI, remote work"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={loading}
                        />
                        <p className="text-xs text-slate-500 mt-2 text-right">{topic.length}/50 characters</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !topic.trim()}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/20 hover:shadow-blue-900/40"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Analyzing Trends...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5" />
                                    Generate Ideas
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {loading && (
                    <div className="mt-6 flex flex-col items-center justify-center py-4 border-t border-white/10">
                        <ProgressBar className="min-h-0 py-2 w-full max-w-md" />
                        <p className="text-sm text-slate-400 mt-4 animate-pulse">Researching real-time search trends...</p>
                    </div>
                )}
            </div>

            {/* Results Section */}
            {result && !loading && (
                <div className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="border-b border-white/10 bg-[#1a1a1a] p-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            Trend Intelligence for "{result.topic}"
                        </h2>
                    </div>

                    <div className="p-6 space-y-8">

                        {/* Trending Topics & Explanation */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-5">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-400" />
                                    Top Search Trends
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {result.trending_topics?.map((t, idx) => (
                                        <span key={idx} className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full text-sm font-medium">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-5">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Presentation className="h-4 w-4 text-purple-400" />
                                    Why This is Trending
                                </h3>
                                <p className="text-slate-300 leading-relaxed text-sm">{result.trend_explanation}</p>
                            </div>
                        </div>

                        {/* Story Idea */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
                                <MessageSquareText className="h-4 w-4 text-blue-400" />
                                Suggested Story Idea
                            </h3>
                            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 relative group">
                                <p className="text-white whitespace-pre-wrap leading-relaxed text-lg font-medium">
                                    {result.story_idea}
                                </p>
                            </div>
                        </div>

                        {/* Hook/Post Titles & Hashtags */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
                                    <Presentation className="h-4 w-4 text-orange-400" />
                                    Engaging Hooks / Titles
                                </h3>
                                <ul className="space-y-3">
                                    {result.titles?.map((title, idx) => (
                                        <li key={idx} className="bg-[#0a0a0a] border border-white/5 p-4 rounded-lg text-white text-sm shadow-sm flex gap-3">
                                            <span className="text-orange-500 font-bold">{idx + 1}.</span>
                                            {title}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-pink-400" />
                                    Optimized Hashtags
                                </h3>
                                <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-5">
                                    <div className="flex flex-wrap gap-2">
                                        {result.hashtags?.map((tag, idx) => (
                                            <span key={idx} className="bg-white/5 text-slate-300 border border-white/10 px-3 py-1.5 rounded-full text-sm hover:bg-white/10 cursor-pointer transition-colors">
                                                {tag.startsWith('#') ? tag : `#${tag}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Proof Links */}
                        {result.proof_links && result.proof_links.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-yellow-500" />
                                    Live Search Proof
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {result.proof_links.map((link, idx) => (
                                        <a
                                            key={idx}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-[#0a0a0a] border border-white/10 hover:border-yellow-500/30 p-4 rounded-lg flex flex-col gap-2 transition-all group"
                                        >
                                            <p className="text-white text-sm font-medium line-clamp-2 group-hover:text-yellow-400 transition-colors">
                                                {link.title}
                                            </p>
                                            <p className="text-slate-500 text-xs truncate">
                                                {link.url}
                                            </p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-right">
                            <p className="text-xs text-slate-600">Generated at: {new Date(result.generated_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecommendationPage;

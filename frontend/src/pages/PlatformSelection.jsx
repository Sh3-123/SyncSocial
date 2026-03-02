import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Youtube, AtSign, Plus, CheckCircle2, ChevronRight, XCircle, RefreshCw, Search } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import ProgressBar from '../components/ProgressBar';
function PlatformSelection() {
    const [connectedAccounts, setConnectedAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showThreadsModal, setShowThreadsModal] = useState(false);
    const [showYoutubeModal, setShowYoutubeModal] = useState(false);
    const [threadsToken, setThreadsToken] = useState('');
    const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('');
    const [youtubeSearchResults, setYoutubeSearchResults] = useState([]);
    const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await fetchWithAuth('/platforms/accounts');
            if (res.ok) {
                const data = await res.json();
                setConnectedAccounts(data);
            }
        } catch (err) {
            console.error('Failed to fetch accounts:', err);
        } finally {
            setLoading(false);
        }
    };

    const isConnected = (platform) => {
        return connectedAccounts.some(acc => acc.platform.toLowerCase() === platform.toLowerCase());
    };

    const handleConnect = async (platform) => {
        if (platform === 'threads') {
            setShowThreadsModal(true);
            return;
        }

        if (platform === 'youtube') {
            setShowYoutubeModal(true);
            return;
        }
    };

    const submitConnection = async (platform, token, username, platform_user_id) => {
        setConnecting(true);
        try {
            const trimmedToken = token.trim();
            if (!trimmedToken) {
                alert('Token cannot be empty');
                setConnecting(false);
                return;
            }

            const res = await fetchWithAuth('/platforms/connect', {
                method: 'POST',
                body: JSON.stringify({
                    platform,
                    token: trimmedToken,
                    username,
                    platform_user_id
                })
            });

            let data;
            try {
                data = await res.json();
            } catch (e) {
                data = { message: 'Server returned an invalid response' };
            }

            if (res.ok) {
                await fetchAccounts();
                setShowThreadsModal(false);
                setShowYoutubeModal(false);
                setThreadsToken('');
                setYoutubeSearchQuery('');
                setYoutubeSearchResults([]);
                alert(`${platform} connected successfully!`);
            } else {
                alert(data.message || 'Connection failed. Please check your token.');
            }
        } catch (err) {
            console.error('Connection failed:', err);
            alert('An error occurred while connecting. Please try again.');
        } finally {
            setConnecting(false);
        }
    };

    const handleThreadsSubmit = async (e) => {
        e.preventDefault();
        if (!threadsToken || connecting) return;
        await submitConnection('threads', threadsToken, '@threads_user', `threads_${Date.now()}`);
    };

    const handleYoutubeSearch = async (e) => {
        e.preventDefault();
        if (!youtubeSearchQuery || isSearchingYoutube) return;

        setIsSearchingYoutube(true);
        try {
            const res = await fetchWithAuth(`/platforms/youtube/search?query=${encodeURIComponent(youtubeSearchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                setYoutubeSearchResults(data);
            } else {
                alert('Failed to search YouTube channels.');
            }
        } catch (err) {
            console.error('YouTube search failed:', err);
            alert('An error occurred during search.');
        } finally {
            setIsSearchingYoutube(false);
        }
    };

    const handleYoutubeConnect = async (channel) => {
        // Send channel.channelId as the token, controller handles verifying it
        await submitConnection('youtube', channel.channelId, channel.title, channel.channelId);
    };

    const handleDisconnect = async (platform) => {
        try {
            const res = await fetchWithAuth(`/platforms/disconnect/${platform}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchAccounts();
            }
        } catch (err) {
            console.error('Disconnect failed:', err);
        }
    };

    const platforms = [
        {
            id: 'threads',
            name: 'Threads',
            icon: AtSign,
            color: 'text-white',
            bg: 'bg-[#121212]',
            description: 'Connect your Threads account using a Long-Lived Access Token to manage posts and track analytics.'
        },
        {
            id: 'youtube',
            name: 'YouTube',
            icon: Youtube,
            color: 'text-red-500',
            bg: 'bg-[#121212]',
            description: 'Connect your YouTube channel to track performance, manage content and analyze audience growth.'
        }
    ];

    if (loading) {
        return <ProgressBar />;
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Connect Your Platforms</h1>
                <p className="text-slate-400">Get started by linking your social media accounts to see your unified metrics.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {platforms.map((platform) => {
                    const connected = isConnected(platform.id);
                    const Icon = platform.icon;

                    return (
                        <div key={platform.id} className={`${platform.bg} border border-white/10 rounded-2xl p-6 transition-all hover:border-white/20 flex flex-col justify-between`}>
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-xl bg-white/5 ${platform.color}`}>
                                        <Icon size={32} />
                                    </div>
                                    {connected && (
                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-semibold">
                                            <CheckCircle2 size={14} />
                                            Connected
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{platform.name}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    {platform.description}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                {connected ? (
                                    <>
                                        <button
                                            onClick={() => navigate(`/dashboard/${platform.id}`)}
                                            className="flex-1 px-4 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            View Dashboard <ChevronRight size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDisconnect(platform.id)}
                                            className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                                            title="Disconnect Account"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleConnect(platform.id)}
                                        className="w-full px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} /> Connect {platform.name}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Threads Connect Modal */}
            {showThreadsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <AtSign size={24} /> Connect Threads
                            </h3>
                            <button onClick={() => {
                                setShowThreadsModal(false);
                                setThreadsToken('');
                            }} className="text-slate-400 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleThreadsSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Long-Lived Access Token
                                </label>
                                <input
                                    type="text"
                                    value={threadsToken}
                                    onChange={(e) => setThreadsToken(e.target.value)}
                                    placeholder="Paste your Threads access token here..."
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={connecting}
                                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {connecting ? <><RefreshCw className="animate-spin" size={20} /> Connecting...</> : 'Connect Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* YouTube Channel Search Modal */}
            {showYoutubeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Youtube className="text-red-500" size={24} /> Connect YouTube Channel
                            </h3>
                            <button onClick={() => {
                                setShowYoutubeModal(false);
                                setYoutubeSearchQuery('');
                                setYoutubeSearchResults([]);
                            }} className="text-slate-400 hover:text-white">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleYoutubeSearch} className="mb-6 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    value={youtubeSearchQuery}
                                    onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                                    placeholder="Search for your channel or paste a video link..."
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-red-500 transition-colors"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSearchingYoutube}
                                className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSearchingYoutube ? <RefreshCw className="animate-spin" size={20} /> : 'Search'}
                            </button>
                        </form>

                        <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                            {youtubeSearchResults.length === 0 && !isSearchingYoutube && youtubeSearchQuery === '' && (
                                <div className="text-center py-12 text-slate-500">
                                    Search for your channel to get started.
                                </div>
                            )}

                            {youtubeSearchResults.map((channel) => (
                                <div key={channel.channelId} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all">
                                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-[#1a1a1a]">
                                        {channel.thumbnailUrl ? (
                                            <img src={channel.thumbnailUrl} alt={channel.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <Youtube size={32} className="text-slate-600 mx-auto mt-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-bold truncate">{channel.title}</h4>
                                        <p className="text-slate-400 text-xs line-clamp-2 mt-1">{channel.description}</p>
                                    </div>
                                    <button
                                        onClick={() => handleYoutubeConnect(channel)}
                                        disabled={connecting}
                                        className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                                    >
                                        Connect
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PlatformSelection;

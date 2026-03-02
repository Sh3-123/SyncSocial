import React, { useState, useEffect } from 'react';

const ProgressBar = ({ className = "min-h-[60vh]" }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simulate loading progress
        const interval = setInterval(() => {
            setProgress(oldProgress => {
                if (oldProgress >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                // Random increment between 5 and 15
                const diff = Math.random() * 10 + 5;
                return Math.min(oldProgress + diff, 90);
            });
        }, 300);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                <div
                    className="h-full bg-white transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="text-white font-bold text-lg">
                {Math.round(progress)}%
            </div>
        </div>
    );
};

export default ProgressBar;

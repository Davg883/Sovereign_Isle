import React from 'react';

interface FutureMemberPageProps {
  onBack: () => void;
}

export const FutureMemberPage: React.FC<FutureMemberPageProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full bg-black/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl text-white animate-fade-in p-6 md:p-8">
      <div className="flex-grow overflow-y-auto flex items-center justify-center">
        <div className="w-full max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

            {/* Image Section */}
            <div className="w-full lg:w-5/12 flex-shrink-0">
              <img
                src="https://i.imgur.com/zsmMfIu.png"
                alt="A dramatic, misty view of The Needles, representing an exclusive experience."
                className="rounded-lg shadow-2xl object-cover w-full h-auto aspect-[4/5]"
              />
            </div>
            
            {/* Content Section */}
            <div className="w-full lg:w-7/12 text-center lg:text-left">
              <h2 className="font-serif-elegant text-4xl md:text-5xl font-semibold leading-tight tracking-wide">
                The Sovereign Key
              </h2>
              <p className="mt-4 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto lg:mx-0">
                Unlock an exclusive tier of the Isle of Wight experience. Become a founding member and be the first to access curated journeys, private events, and unique privileges reserved for the few.
              </p>

              <div className="my-8 border-t border-white/10 max-w-sm mx-auto lg:mx-0"></div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10 h-full">
                      <h3 className="font-serif-elegant text-xl">Bespoke Itineraries</h3>
                      <p className="mt-1 text-gray-400 text-sm">Crafted by Isabella, revealing the Island's most guarded secrets.</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10 h-full">
                      <h3 className="font-serif-elegant text-xl">Priority Access</h3>
                      <p className="mt-1 text-gray-400 text-sm">Privileged entry to exclusive wellness retreats and cultural happenings.</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10 h-full">
                      <h3 className="font-serif-elegant text-xl">Member's Concierge</h3>
                      <p className="mt-1 text-gray-400 text-sm">A dedicated line to Isabella for seamless, sovereign service.</p>
                  </div>
              </div>

              <div className="mt-8">
                <p className="font-serif-elegant text-2xl">Register Your Interest</p>
                <p className="text-gray-400 mt-1">Be the first to know when the portal opens.</p>
                <div className="mt-6 flex flex-col sm:flex-row items-stretch justify-center lg:justify-start gap-2 max-w-md mx-auto lg:mx-0">
                  <input 
                    type="email"
                    placeholder="Enter your email address"
                    className="w-full sm:w-auto flex-grow bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    disabled
                  />
                  <button
                    className="w-full sm:w-auto bg-white/10 text-white rounded-full px-6 py-3 hover:bg-white/20 disabled:opacity-70 disabled:cursor-not-allowed transition-colors font-semibold flex-shrink-0"
                    disabled
                  >
                    Notify Me
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 pt-6 text-center">
        <button onClick={onBack} className="flex items-center gap-2 mx-auto text-gray-300 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Isabella
        </button>
      </div>
       <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }
       `}</style>
    </div>
  );
};
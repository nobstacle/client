import React from 'react';

const NobstacleExtensionsAndVideo = () => {
  return (
    <div className="bg-white">
      {/* Browser Extensions Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto text-center">

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Add Nobstacle to your browser
          </h2>
          
          {/* Extension Cards */}
          <div className="flex flex-col sm:flex-row justify-center items-stretch gap-8 max-w-4xl mx-auto">
            {/* Chrome Card */}
            <a 
              href="https://chromewebstore.google.com/detail/magic-box-by-nobstacle/hkefcbmmedhekjdnmpkpmdbnhnhmhlld"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-orange-400 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="flex items-center justify-center mx-auto mb-6 group-hover:scale-60 transition-transform">
                <img 
                  src="/chrome-web-store.png" 
                  alt="Chrome Web Store" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Chrome Web Store</h3>
              <p className="text-gray-600 mb-6">For Chrome & Chromium browsers</p>
              <span className="inline-flex items-center text-blue-600 text-sm font-semibold group-hover:text-orange-500 transition-colors">
                Add to Chrome
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </a>

            {/* Edge Card */}
            <a 
              href="https://microsoftedge.microsoft.com/addons/detail/magic-box-by-nobstacle/dkkpgjdkihifanfknfmojjgeancegnhi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-400 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="flex items-center justify-center mx-auto mb-6 group-hover:scale-60 transition-transform">
                <img 
                  src="/microsoft-store.png" 
                  alt="Microsoft Edge Store" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Microsoft Edge Store</h3>
              <p className="text-gray-600 mb-6">For Microsoft Edge browser</p>
              <span className="inline-flex items-center text-blue-600 text-sm font-semibold group-hover:text-blue-700 transition-colors">
                Add to Edge
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What is Nobstacle?
          </h2>
          
          {/* Video Container */}
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-xl bg-gray-900">
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src="https://www.youtube.com/embed/jB_1CZFjAGw"
                  title="What is Nobstacle?"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
            </div>
            
            {/* Feature Pills Below Video */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <div className="bg-blue-50 px-5 py-2 rounded-full border border-blue-100">
                <span className="text-sm font-medium text-blue-700">⚡ Fast & Efficient</span>
              </div>
              <div className="bg-green-50 px-5 py-2 rounded-full border border-green-100">
                <span className="text-sm font-medium text-green-700">🔒 Secure</span>
              </div>
              <div className="bg-purple-50 px-5 py-2 rounded-full border border-purple-100">
                <span className="text-sm font-medium text-purple-700">✨ Easy to Use</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NobstacleExtensionsAndVideo;
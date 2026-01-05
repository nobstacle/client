import React from 'react';

const NobstacleExtensionsAndVideo = () => {
  return (
    <div className="bg-white">
      {/* Browser Extensions Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Add Nobstacle to your browser
          </h2>
          <p className="text-gray-600 mb-10 max-w-2xl mx-auto">
            Enhance your browsing experience with our powerful extension available for Chrome and Edge
          </p>
          
          {/* Extension Cards */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 max-w-3xl mx-auto">
            {/* Chrome Card */}
            <a 
              href="https://chromewebstore.google.com/detail/magic-box-by-nobstacle/hkefcbmmedhekjdnmpkpmdbnhnhmhlld"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-72 bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.99 17.99l-3.99-3.99-3.99 3.99-2.12-2.12 3.99-3.99-3.99-3.99L9.01 6.01l3.99 3.99 3.99-3.99 2.12 2.12-3.99 3.99 3.99 3.99-2.12 2.12z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chrome Web Store</h3>
              <p className="text-sm text-gray-600 mb-4">For Chrome & Chromium browsers</p>
              <span className="text-blue-600 text-sm font-medium group-hover:underline">
                Add to Chrome →
              </span>
            </a>

            {/* Edge Card */}
            <a 
              href="https://microsoftedge.microsoft.com/addons/detail/magic-box-by-nobstacle/dkkpgjdkihifanfknfmojjgeancegnhi"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-72 bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.48l7 3.5v7.84l-7-3.5V9.48zm9 11.34v-7.84l7-3.5v7.84l-7 3.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Microsoft Edge Store</h3>
              <p className="text-sm text-gray-600 mb-4">For Microsoft Edge browser</p>
              <span className="text-blue-600 text-sm font-medium group-hover:underline">
                Add to Edge →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            What is Nobstacle?
          </h2>
          <p className="text-gray-600 mb-10 max-w-2xl mx-auto">
            Watch our introduction video to learn how Nobstacle can transform your customer experience
          </p>
          
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
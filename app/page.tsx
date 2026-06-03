export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Logo + Alpha Site */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl tracking-wide">Alpha Site</span>
          </div>
          
          <div className="flex items-center gap-8 text-gray-700">
            <a href="#" className="hover:text-black font-medium">Home</a>
            <a href="#" className="hover:text-black font-medium">About</a>
          </div>

          <div className="flex items-center gap-4">
            <button className="px-6 py-2 text-gray-700 hover:text-black font-medium">Log In</button>
            <button className="px-6 py-2 bg-black text-white rounded-2xl font-medium hover:bg-gray-800">Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center text-center overflow-hidden">
        <img 
          src="/group.jpg" 
          alt="OfferCrew Robots" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Turn Boring Credit Card and Loan Mail Into<br />
            <span className="text-cyan-400">Hilarious (and Educational) Robot Commentary</span>
          </h1>
          
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Upload your credit card, loan, financial mail. Watch the Crew react.
          </p>

          <div className="flex justify-center gap-4">
            <button className="px-8 py-4 bg-white text-black rounded-2xl font-semibold hover:bg-gray-100 text-lg">
              Log In
            </button>
            <button className="px-8 py-4 bg-cyan-500 text-white rounded-2xl font-semibold hover:bg-cyan-600 text-lg">
              Sign Up
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-2xl font-semibold hover:bg-white/20 text-lg">
              Free Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
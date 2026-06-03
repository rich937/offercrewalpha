export default function Login() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OfferCrew" className="h-10" />
            <span className="text-red-600 font-semibold text-xl">Alpha Site</span>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mb-2">Welcome back</h2>
        <p className="text-gray-500 text-center mb-8">Log in to see your Crew reactions</p>

        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input 
              type="text" 
              placeholder="Enter your username" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              placeholder="Enter your password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-between text-sm">
            <a href="#" className="text-cyan-600 hover:text-cyan-700">Forgot password?</a>
          </div>

          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition"
          >
            Log In
          </button>
        </form>

        <p className="text-center mt-8 text-gray-600">
          Don't have an account?{" "}
          <a href="/signup" className="text-cyan-600 font-medium hover:text-cyan-700">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
'use client';

export default function SignUp() {
  const handleClick = () => {
    console.log("🚀 CREATE ACCOUNT BUTTON WAS CLICKED!");
    alert("Button works! Check the console.");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center">
        <h1 className="text-4xl font-bold mb-8">Test Page</h1>
        
        <button 
          onClick={handleClick}
          className="w-full bg-black text-white py-6 rounded-2xl text-xl font-bold"
        >
          CLICK ME - TEST BUTTON
        </button>

        <p className="mt-8 text-gray-500">If you see "🚀 CREATE ACCOUNT BUTTON WAS CLICKED!" in the console, the button works.</p>
      </div>
    </div>
  );
}
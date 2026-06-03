'use client';

export default function SignUpTest() {
  const handleClick = () => {
    console.log("🚀 BUTTON WAS CLICKED SUCCESSFULLY!");
    alert("✅ Button works! JavaScript is running.");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-md">
        <h1 className="text-4xl font-bold mb-8">JavaScript Test</h1>
        
        <button 
          onClick={handleClick}
          className="bg-black text-white px-10 py-6 rounded-2xl text-2xl font-bold hover:bg-gray-800"
        >
          CLICK THIS BUTTON
        </button>

        <p className="mt-8 text-gray-600">
          If you see an alert and "🚀 BUTTON WAS CLICKED..." in the console, interactivity works.
        </p>
      </div>
    </div>
  );
}
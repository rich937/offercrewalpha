'use client';

export default function Test() {
  return (
    <div className="min-h-screen bg-red-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8">TEST PAGE</h1>
        <button 
          onClick={() => alert("✅ IT WORKS!")}
          className="bg-black text-white px-12 py-8 text-2xl rounded-2xl"
        >
          CLICK ME
        </button>
        <p className="mt-8">If you see an alert, JavaScript works.</p>
      </div>
    </div>
  );
}
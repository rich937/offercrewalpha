// app/blog/2/page.tsx
import Link from 'next/link';

export default function BlogPost2() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose prose-lg">
      <div className="mb-8">
        <Link href="/blog" className="text-cyan-600 hover:underline">← Back to Blog</Link>
      </div>

      <div className="text-xs uppercase tracking-widest text-cyan-600 mb-2">Home Loans</div>
      <h1 className="text-4xl font-bold mb-4">What Is a HELOC and Should You Get One?</h1>
      <p className="text-gray-500">By Clara • June 17, 2026 • 12 min read</p>

      <div className="my-10">
        <img src="/icons/Clara Icon.png" alt="Clara" className="w-16 h-16 rounded-full" />
        <p className="text-sm text-gray-500 mt-1">Written by Clara</p>
      </div>

      <p className="text-xl leading-relaxed">
        Hello friends. Today I want to talk about one of the most powerful — and potentially dangerous — financial tools available to homeowners: the Home Equity Line of Credit, or HELOC.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-6">What Exactly Is a HELOC?</h2>
      <p>A HELOC is a revolving line of credit that uses the equity in your home as collateral. During the draw period (usually 5–10 years), you can borrow as much or as little as you need, similar to a credit card. After the draw period ends, you enter the repayment phase where you pay back what you borrowed plus interest.</p>

      <h2 className="text-2xl font-semibold mt-12 mb-6">When a HELOC Makes Sense</h2>
      <ul className="list-disc pl-6 space-y-3">
        <li>Funding home renovations that will increase your property value</li>
        <li>Consolidating high-interest debt like credit cards or personal loans</li>
        <li>Covering major medical expenses or education costs</li>
        <li>Acting as an emergency fund for homeowners with stable income</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-12 mb-6">When You Should Avoid a HELOC</h2>
      <ul className="list-disc pl-6 space-y-3">
        <li>If your income is unstable or commission-based</li>
        <li>If you’re already carrying a lot of other debt</li>
        <li>If you’re tempted to use it for vacations, cars, or lifestyle purchases</li>
        <li>If home values in your area have been volatile</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-12 mb-6">Important Questions to Ask Before Signing</h2>
      <p>1. What is the current interest rate and how often does it adjust?<br/>
         2. What are the closing costs and annual fees?<br/>
         3. What happens if home values drop significantly?<br/>
         4. Is there a minimum draw requirement?</p>

      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 my-12">
        <div className="flex items-start gap-4">
          <img src="/icons/Ledger Icon.png" alt="Ledger" className="w-12 h-12 rounded-full flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-700">Ledger chimes in:</p>
            <p className="text-amber-700">"Clara is right. Always run the numbers carefully. A HELOC should be a strategic tool, not a convenience."</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mt-12 mb-6">Final Thought</h2>
      <p>A HELOC can be an excellent financial tool when used responsibly with a clear repayment plan. However, because your home is on the line, it should never be treated like free money. Take your time, compare multiple lenders, and consider speaking with a financial advisor before moving forward.</p>

      <div className="mt-16 pt-8 border-t text-center">
        <Link href="/dashboard" className="inline-block bg-black text-white px-8 py-4 rounded-2xl font-medium hover:bg-gray-800">
          Try OfferCrew Yourself →
        </Link>
      </div>
    </div>
  );
}
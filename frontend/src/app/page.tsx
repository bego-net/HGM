import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-slate-950 overflow-x-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center font-bold text-slate-950 shadow-md">
              E
            </div>
            <span className="font-bold text-lg tracking-wider text-white">EIDS 2025</span>
          </div>
          <Link
            href="/register"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 hover:from-teal-300 hover:to-emerald-400 shadow-lg shadow-teal-500/10 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Register Now
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 text-xs font-semibold tracking-wider uppercase mb-6 animate-pulse">
          <span>📅 March 14-16, 2025</span>
          <span className="text-slate-700">•</span>
          <span>📍 Addis Ababa, Ethiopia</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Ethiopia Innovation & <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
            Development Summit
          </span>
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Join 3,000+ industry leaders, innovators, policymakers, and academics to explore pioneering strategies shaping the future of East Africa's technological landscape.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 text-slate-950 hover:opacity-95 shadow-xl shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-300 transform hover:-translate-y-1 text-center"
          >
            Secure Your Pass
          </Link>
          <a
            href="#details"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold border border-slate-800 text-slate-300 hover:bg-slate-900/60 hover:text-white transition-all text-center"
          >
            View Event Info
          </a>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-900/60 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="bg-slate-950 p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">3,000+</p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">Participants</p>
          </div>
          <div className="bg-slate-950 p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">48</p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">Sessions</p>
          </div>
          <div className="bg-slate-950 p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">120+</p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">Speakers</p>
          </div>
          <div className="bg-slate-950 p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">3 Days</p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">Duration</p>
          </div>
        </div>
      </section>

      {/* Info Cards Section */}
      <section id="details" className="max-w-5xl mx-auto px-6 pb-24 scroll-mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Key Event Details</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Everything you need to know about registering and attending the Ethiopia Innovation & Development Summit 2025.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Card 1: Venue */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all shadow-md group">
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-xl mb-5 group-hover:bg-teal-500/20 transition-all">
              📍
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Premium Venue</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-1">
              **Millennium Hall**, Addis Ababa, Ethiopia.
            </p>
            <p className="text-slate-500 text-xs">
              Centrally located with state-of-the-art facilities, direct accessibility, and parking.
            </p>
          </div>

          {/* Card 2: Dates */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all shadow-md group">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl mb-5 group-hover:bg-emerald-500/20 transition-all">
              📅
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Event Schedule</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-1">
              **March 14-16, 2025**
            </p>
            <p className="text-slate-500 text-xs">
              A comprehensive three-day schedule featuring keynotes, panel debates, and workshops.
            </p>
          </div>

          {/* Card 3: Registration Fee */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all shadow-md group">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl mb-5 group-hover:bg-amber-500/20 transition-all">
              💳
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Registration Fee</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              **500 ETB** — Payable via Commercial Bank of Ethiopia (CBE) transfer.
            </p>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
              <p className="text-slate-400">CBE Account Number:</p>
              <p className="text-amber-400 text-sm font-bold tracking-wider mt-0.5">1000123456789</p>
              <p className="text-slate-500 mt-1">Please save the receipt for file upload.</p>
            </div>
          </div>

          {/* Card 4: QR Badge Info */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all shadow-md group">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xl mb-5 group-hover:bg-purple-500/20 transition-all">
              🎟️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Digital QR Badges</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-1">
              Instant entry check-in and lunch access verification.
            </p>
            <p className="text-slate-500 text-xs">
              Every confirmed registrant receives a QR code to be scanned at summit gates and food courts.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-slate-500 text-center text-sm">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-slate-400 mb-2">EIDS 2025 — Ethiopia Innovation & Development Summit</p>
          <p>© 2026 EIDS Organization Committee. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

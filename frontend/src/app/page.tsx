import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-slate-950 overflow-x-hidden relative">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-black text-xl tracking-wide text-white">ስምህ ይቀደስ</span>
          </div>
          <Link
            href="/register"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 hover:from-teal-300 hover:to-emerald-400 shadow-lg shadow-teal-500/10 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            አሁኑኑ ይመዝገቡ
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 text-xs font-semibold tracking-wider uppercase mb-6 animate-pulse">
          <span>📅 ከሐምሌ 21 - 24/2018 ዓ.ም (ለ 4 ሙሉ ቀናት)</span>
          <span className="text-slate-700">•</span>
          <span>📍 ሆሳዕና ከተማ</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          ✨ "ስምህ ይቀደስ" ✨ <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 bg-clip-text text-transparent text-3xl sm:text-5xl font-black mt-2 block">
            ሀገር አቀፍ የተልዕኮ ስልጠና
          </span>
        </h1>
        
        <p className="text-slate-300 text-lg sm:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
          ክርስቲያኖችን ለታላቁ ተልዕኮ የማነሳሳት እና የማስታጠቅ ታላቅ ጉባኤ! 
          <br className="hidden md:block"/>
          ዘንድሮ በጉጉት የሚጠበቀው የ"ስምህ ይቀደስ" ሀገር አቀፍ የተልዕኮ ስልጠና ትኩረቱን 
          <strong className="text-teal-400 font-bold"> "ተግባራዊ ክርስትና ለተልዕኮ" </strong> 
          በሚለው ዐቢይ ሃሳብ ላይ አድርጎ ተዘጋጅቷል። እምነትዎን በተግባር የሚገልጹበት፣ መንፈሳዊ ህይወትዎን የሚያድሱበት እና ለወንጌል አገልግሎት የሚበቁበት ልዩ መድረክ ነው።
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 text-slate-950 hover:opacity-95 shadow-xl shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-300 transform hover:-translate-y-1 text-center"
          >
            አሁኑኑ ይመዝገቡ
          </Link>
          <a
            href="#objectives"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold border border-slate-800 text-slate-300 hover:bg-slate-900/60 hover:text-white transition-all text-center"
          >
            የስልጠናው ዓላማዎች
          </a>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-900/60 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="bg-slate-950 p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">3,000+</p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">ባለፈው ዓመት ሰልጣኞች</p>
          </div>
          <div className="bg-slate-950 p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">4 ቀናት</p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">የስልጠና ቆይታ</p>
          </div>
          <div className="bg-slate-950 p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">4+</p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">ዋና ዋና ተናጋሪዎች</p>
          </div>
          <div className="bg-slate-950 p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">ሆሳዕና</p>
            <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">የስልጠናው ቦታ</p>
          </div>
        </div>
      </section>

      {/* Objectives Section */}
      <section id="objectives" className="max-w-5xl mx-auto px-6 pb-16 scroll-mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">🎯 የስልጠናው ዋና ዋና ዓላማዎች</h2>
          <p className="text-slate-400 max-w-xl mx-auto">በእምነታችን በተግባር እንድንኖር እና ለወንጌል ተልዕኮ እንድንዘጋጅ የሚረዱን ዋና ዋና ዓላማዎች።</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Objective 1 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all shadow-md group">
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-xl mb-5 group-hover:bg-teal-500/20 transition-all">
              🔥
            </div>
            <h3 className="text-lg font-bold text-white mb-2">ማነሳሳትና ማስታጠቅ</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              ክርስቲያኖችን በተለይም ወጣት ክርስቲያኖችን ለታላቁ የወንጌል ተልዕኮ ማዘጋጀት።
            </p>
          </div>

          {/* Objective 2 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all shadow-md group">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl mb-5 group-hover:bg-emerald-500/20 transition-all">
              🌱
            </div>
            <h3 className="text-lg font-bold text-white mb-2">ተግባራዊ ኑሮ</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              አሁን ላይ የሚታየውን የተግባራዊ ክርስትና ክፍተት በመገንዘብ ቅዱሳን እንደሚገባው ኖሩ ዘንድ ማገዝ።
            </p>
          </div>

          {/* Objective 3 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all shadow-md group">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl mb-5 group-hover:bg-amber-500/20 transition-all">
              🌐
            </div>
            <h3 className="text-lg font-bold text-white mb-2">የተልዕኮ እድል መፍጠር</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              በአለም አቀፍ የወንጌል ተልዕኮ ላይ ለመሳተፍ ፍላጎት እና ውሳኔ ያላቸው ወጣቶች በቀጥታ ወደ ተልዕኮ መስክ የሚሰማሩበትን ምቹ ሁኔታ መፍጠር።
            </p>
          </div>

          {/* Objective 4 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all shadow-md group">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xl mb-5 group-hover:bg-purple-500/20 transition-all">
              👣
            </div>
            <h3 className="text-lg font-bold text-white mb-2">ተግባራዊ እንቅስቃሴ</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              ከስልጠናው መጠናቀቅ በኋላ በሀገር ውስጥ የተለያዩ ክፍሎች የወንጌል ስርጭት ጉዞዎችን ማካሄድ።
            </p>
          </div>
        </div>
      </section>

      {/* Social Media & Registration CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/40 border border-slate-800 p-8 sm:p-12 rounded-3xl shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">📲 አሁኑኑ ይከተሉን</h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            ስለ ስልጠናው ይበልጥ ለማወቅ እና ወቅታዊ መረጃዎችን ለመከታተል የማህበራዊ ሚዲያ ገጾቻችንን አሁኑኑ Follow እና Join ያድርጉ።
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <a
              href="https://www.tiktok.com/@hgm180?_r=1&_d=ekl33fc5k83e80&sec_uid=MS4wLjABAAAAcUlBx8Zyr6PaQbRhAc-yPujnT-gV3fGT-aaXpBqMKxpwFGjlfCYYuTjhsQWOnqOA&share_author_id=7505492450350629943&sharer_language=en&source=h5_m&u_code=e78gc0adg78m56&timestamp=1781118170&user_id=7218218390287123462&sec_user_id=MS4wLjABAAAAzmZA5v0hPdfyN1OtBwrCloT-UU11ZmlgHggxFyDrlkYje-GSQ1dBNoG570O8yejM&item_author_type=2&utm_source=copy&utm_campaign=client_share&utm_medium=android&share_iid=7641307348003358484&share_link_id=9352e3f3-ccf6-43fe-bec4-70e44ad48fe4&share_app_id=1233&ugbiz_name=ACCOUNT&ug_btm=b6880%2Cb5836&social_share_type=5&enable_checksum=1"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 hover:text-white flex items-center gap-2.5 hover:border-slate-700 transition-all text-sm font-semibold"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.54-4.06-1.41-.31-.23-.61-.48-.88-.75v6.52c-.03 2.36-1.01 4.72-2.9 6.13-2.18 1.72-5.35 2.1-7.89 1.05-2.45-1-4.25-3.41-4.52-6.07-.44-3.47 1.54-7.05 4.88-8.15.86-.3 1.77-.42 2.68-.37V11.2c-.89-.15-1.85.05-2.58.62-.97.74-1.36 2.09-1.02 3.28.32 1.37 1.64 2.42 3.06 2.39 1.56-.05 2.91-1.34 2.93-2.91V.02h.88z"/>
              </svg>
              TikTok
            </a>
            <a
              href="https://t.me/hossanagospelmovement"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 hover:text-white flex items-center gap-2.5 hover:border-slate-700 transition-all text-sm font-semibold"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.65 6.32-2.74 7.59-3.27 3.6-1.5 4.35-1.76 4.84-1.77.11 0 .35.03.51.16.13.1.17.24.19.34.02.1.02.23 0 .28z"/>
              </svg>
              Telegram
            </a>
            <a
              href="https://www.facebook.com/share/1AiqmwHKZc/"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 hover:text-white flex items-center gap-2.5 hover:border-slate-700 transition-all text-sm font-semibold"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
              </svg>
              Facebook
            </a>
          </div>

          <Link
            href="/register"
            className="inline-flex px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 hover:opacity-95 shadow-lg shadow-teal-500/10 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            አሁኑኑ ይመዝገቡ (Register Now)
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-slate-500 text-center text-sm">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-slate-400 mb-2">🙏 አዘጋጅ፡ HGM (Hossana Gospel Movement)</p>
          <p>© 2026 HGM. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

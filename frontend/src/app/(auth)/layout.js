export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Right side - Orange accent */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-400 to-orange-600 items-center justify-center">
        <div className="text-white text-center p-8">
          <h1 className="text-5xl font-bold mb-4">AniCon</h1>
          <p className="text-xl opacity-90">Cambodia&apos;s Anime Community</p>
        </div>
      </div>
    </div>
  );
}

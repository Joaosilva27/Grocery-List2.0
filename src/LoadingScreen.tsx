export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-4">
      <div className="relative w-20 h-20">
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-green-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.2}s`,
                transformOrigin: "bottom center",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-green-500 font-semibold text-xl animate-pulse">
          Loading
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" />
          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce delay-100" />
          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce delay-200" />
        </div>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-white text-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-4">
        Page Not Found
      </h1>
      <p className="text-lg md:text-xl opacity-50 font-light">
        Made a wrong turn?
      </p>

      
        href="/"
        className="mt-10 flex items-center gap-2.5 px-6 py-3 rounded-xl font-medium text-sm text-white/80 hover:text-white transition-all duration-200"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.13)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
        }}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 opacity-80"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 0L0 6V8H1V15H4V10H7V15H15V8H16V6L14 4.5V1H11V2.25L8 0ZM9 10H12V13H9V10Z"
            fill="#ffffff"
          />
        </svg>
        Go Home
      </a>
    </main>
  );
}

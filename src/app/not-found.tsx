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
        className="mt-10 flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.08] hover:bg-white/[0.13] border border-white/10 transition-all duration-200"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 0L0 6V8H1V15H4V10H7V15H15V8H16V6L14 4.5V1H11V2.25L8 0ZM9 10H12V13H9V10Z"
            fill="white"
          />
        </svg>
        Go Home
      </a>
    </main>
  );
}

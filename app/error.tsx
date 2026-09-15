'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fallback-world">
      <h1>Our little world needs a moment.</h1>
      <p>Your saved letters are safe.</p>
      <button className="pixel-button" onClick={reset}>
        try again
      </button>
    </main>
  );
}

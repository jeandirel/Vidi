'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Le studio a rencontré un problème.</h1>
      <button onClick={reset}>Réessayer</button>
    </main>
  );
}

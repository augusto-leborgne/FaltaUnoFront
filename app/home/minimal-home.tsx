"use client"

export default function MinimalHome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Home está funcionando</h1>
        <p className="text-gray-600 mb-6">
          Si ves esto, el dynamic import funciona correctamente.
        </p>
        <a 
          href="/matches" 
          className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
        >
          Ir a Partidos
        </a>
      </div>
    </div>
  )
}

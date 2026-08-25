import { apiClient } from "@repo/api-client";

export const revalidate = 0; // Dynamic fetch on each request

export default async function HomePage() {
  const { data: items, error } = await apiClient.GET("/items");

  if (error) {
    return (
      <main className="p-8 font-sans">
        <h1 className="text-xl font-bold text-red-600">Error connecting to API</h1>
        <pre className="mt-2 bg-gray-100 p-4 rounded text-sm">{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  return (
    <main className="p-8 font-sans max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Web Client (Next.js)</h1>
      <p className="text-gray-600 mb-6">Items loaded from FastAPI backend:</p>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="p-4 border rounded-lg shadow-sm">
            <div className="flex justify-between items-baseline">
              <h2 className="font-semibold text-lg">{item.title}</h2>
              <span className="text-green-600 font-mono font-bold">${item.price.toFixed(2)}</span>
            </div>
            {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}

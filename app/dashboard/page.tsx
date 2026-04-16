export default function DashboardPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Good morning</h1>

      <div className="flex flex-col gap-4">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-1">Your Diet Plan</h2>
          <p className="text-sm text-gray-500">No plan uploaded yet.</p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-1">Today's Meals</h2>
          <p className="text-sm text-gray-500">No meals tracked yet.</p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-1">Having a craving?</h2>
          <p className="text-sm text-gray-500">Log it and get support.</p>
        </div>
      </div>
    </main>
  )
}
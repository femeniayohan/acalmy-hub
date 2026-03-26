export default function HubLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-6 w-48 bg-[rgba(0,0,0,0.06)] rounded-[8px] mb-2" />
        <div className="h-4 w-64 bg-[rgba(0,0,0,0.04)] rounded-[8px]" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 h-28" />
        ))}
        <div className="card p-5 h-64 md:col-span-2" />
        <div className="card p-5 h-64" />
      </div>
    </div>
  )
}

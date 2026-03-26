export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f4f0] flex flex-col items-center justify-center p-4">
      {/* Acalmy wordmark */}
      <div className="mb-8">
        <span className="text-lg font-semibold tracking-tight text-[#0a0a0a]">acalmy</span>
      </div>
      {children}
    </div>
  )
}

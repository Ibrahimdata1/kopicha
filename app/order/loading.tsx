export default function OrderLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-stone-500 text-sm">กำลังโหลดเมนู...</p>
      </div>
    </div>
  )
}

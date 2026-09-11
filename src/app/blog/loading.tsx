export default function BlogLoading() {
  return (
    <div className="flex w-full max-w-6xl flex-col items-center gap-6 px-4 sm:px-6 pt-28 sm:pt-32">
      <div className="flex w-full flex-col items-center gap-3 text-center pb-6">
        <span className="h-4 w-16 rounded-full shimmer" />
        <span className="h-8 w-32 rounded-lg shimmer" />
        <span className="h-3 w-72 max-w-full rounded-md shimmer" />
      </div>
      <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-large bg-background p-5"
          >
            <span className="h-3 w-24 rounded-md shimmer" />
            <span className="h-5 w-4/5 rounded-md shimmer" />
            <span className="h-3 w-full rounded-md shimmer" />
            <span className="h-3 w-3/4 rounded-md shimmer" />
            <span className="mt-2 h-3 w-20 rounded-md shimmer" />
          </div>
        ))}
      </div>
    </div>
  )
}

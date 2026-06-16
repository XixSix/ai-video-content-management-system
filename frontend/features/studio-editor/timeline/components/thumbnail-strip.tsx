export function TimelineThumbnailStrip({
  thumbnailUrl,
}: {
  thumbnailUrl: string | null | undefined
}) {
  if (!thumbnailUrl) {
    return null
  }

  return (
    <div className="flex h-[62%] w-[190%] items-stretch">
      {Array.from({ length: 18 }).map((_, thumbnailIndex) => (
        <div
          key={thumbnailIndex}
          className="relative h-full flex-1 border-r border-black/30 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />
        </div>
      ))}
    </div>
  )
}

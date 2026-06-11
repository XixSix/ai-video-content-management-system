"use client"

import { studioCanvasOverlays } from "@/features/studio/studio.data"

export function StudioCanvas() {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(125,125,125,0.1),transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--background)_92%,black_8%),var(--background))]">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-muted)_82%,transparent),transparent)] p-5">
          <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#1e7397,#0c4364_55%,#092c43)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.15))]" />
            <div className="absolute left-[11%] top-[19%] size-[24%] rounded-full bg-[rgba(0,0,0,0.16)] blur-3xl" />
            <div className="absolute right-[9%] top-[9%] h-[43%] w-[21%] rounded-[18px] border border-white/12 bg-[rgba(3,10,15,0.28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
            <div className="absolute left-[16%] top-[28%] h-[56%] w-[18%] rounded-[22px] bg-[rgba(255,255,255,0.18)] blur-[2px]" />
            <div className="absolute right-[10%] top-[34%] h-[48%] w-[20%] rounded-[22px] bg-[rgba(0,0,0,0.18)] blur-[2px]" />

            {studioCanvasOverlays.map((overlay) => (
              <div key={overlay.id} className={overlay.className}>
                {overlay.label}
              </div>
            ))}

            <div className="absolute left-[8%] top-[16%] h-[21%] w-[46%] rounded-2xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]">
              <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
              <div className="absolute -right-1.5 -top-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
              <div className="absolute -left-1.5 -bottom-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
              <div className="absolute -right-1.5 -bottom-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

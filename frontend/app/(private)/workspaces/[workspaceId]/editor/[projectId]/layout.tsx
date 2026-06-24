import type { ReactNode } from "react"
import {
  Anton,
  Bebas_Neue,
  Caveat,
  Montserrat,
  Oswald,
  Playfair_Display,
  Poppins,
  Roboto_Mono,
  Teko,
} from "next/font/google"

import StudioEditorClientLayout from "./studio-editor-client-layout"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
})

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

const teko = Teko({
  variable: "--font-teko",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
})

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
})

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
})

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
})

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
})

const editorFontVariables = [
  montserrat.variable,
  poppins.variable,
  oswald.variable,
  teko.variable,
  bebasNeue.variable,
  anton.variable,
  playfairDisplay.variable,
  caveat.variable,
  robotoMono.variable,
].join(" ")

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className={editorFontVariables}>
      <StudioEditorClientLayout>{children}</StudioEditorClientLayout>
    </div>
  )
}

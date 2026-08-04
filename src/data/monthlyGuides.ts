export interface GuideTarget { id: string; note: string; capture: string; }
export interface GuideEvent { date: string; title: string; description: string; }

export const august2026Guide = {
  month: "August 2026",
  title: "The Moon’s triple act",
  intro: "August is one of those months where the Moon sets the rhythm for me. I get a dark-sky run, a total solar eclipse and a deep partial lunar eclipse — with the Perseids landing right beside new Moon. Here is how I’d plan it.",
  north: "I’ll use the first half of the night for Cygnus while it is riding high, then turn east toward Pegasus and Aquarius. Sagittarius and the galactic core are already slipping west, so I won’t leave them until too late.",
  south: "I’ll start on the galactic core while it is still well placed, then move into Aquarius and Capricornus. The Helix Nebula is one of my strongest late-night choices this month.",
  events: [
    { date: "4 Aug", title: "Last quarter", description: "A useful run of darker evenings begins as the Moon moves toward new." },
    { date: "12 Aug", title: "New Moon + total solar eclipse", description: "The darkest night of the month arrives with a total eclipse visible along a narrow path. I’ll treat this as specialist solar imaging only." },
    { date: "12–13 Aug", title: "Perseid maximum", description: "This is the night I’d choose for a wide, fast lens: the peak meets a new Moon, so faint meteors get a much better chance." },
    { date: "20 Aug", title: "First quarter", description: "Moonlight returns to the evening sky, so I’ll lean toward brighter clusters or narrowband emission targets." },
    { date: "27–28 Aug", title: "Full Moon + partial lunar eclipse", description: "Up to 96.2% of the Moon enters Earth’s umbra. Maximum eclipse is around 04:12 UTC on 28 August." },
  ] as GuideEvent[],
  targets: [
    { id: "ngc7000", note: "My first wide-field choice in Cygnus. Pair it with the Pelican if the sensor allows.", capture: "Dual-band or narrowband · 3–6 hours" },
    { id: "ngc6888", note: "The Crescent rewards deep OIII, especially if I want to pull out the surrounding bubble.", capture: "Ha + OIII · 3–6 hours" },
    { id: "ic1396", note: "I can frame the whole complex wide, or tighten in on the Elephant’s Trunk for more structure.", capture: "Dual-band or SHO · 3–6 hours" },
    { id: "ngc7293", note: "The Helix is my late-night southern prize. I’ll give it clear horizon and plenty of OIII.", capture: "Ha + OIII · 3–6 hours" },
    { id: "m57", note: "A bright compact fallback for moonlit or less transparent nights, provided the focal length is there.", capture: "RGB + OIII · 1–3 hours" },
  ] as GuideTarget[],
};

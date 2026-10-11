// Royal theme (dark green, champagne gold, cream). Change colours and fonts here to restyle the whole site.
export default { content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      gold: { DEFAULT: "#DBB077", light: "#EDCFA2", dark: "#7A5A2A" }, // champagne gold; `dark` is for text on cream
      pearl: "#F1E8D4",   // brightest text
      ink: "#E4DAC4",     // body text on dark (use /60 for muted)
      night: "#071C12",   // page background
      panel: "#0B2518",   // cards, tables, forms
      emerald: "#0F3022", // raised surfaces
      cream: "#E9DFCB",   // light sections
    },
    borderColor: { DEFAULT: "rgb(219 176 119 / 0.28)" }, // a plain `border` is a fine gold hairline
    fontFamily: {
      display: ["VH Numerals", "Cormorant Garamond", "Georgia", "serif"], // headings
      crest: ["VH Numerals", "Cinzel", "Georgia", "serif"],  // logo lettering only
      sans: ["VH Numerals", "EB Garamond", "Georgia", "serif"], // body text; "VH Numerals" only supplies the digits
    },
    boxShadow: { gold: "0 10px 30px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(219 176 119 / 0.5)" },
  } } };

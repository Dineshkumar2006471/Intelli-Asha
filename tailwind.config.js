/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
              "border-default": "#E5E7EB",
              "verified-bg": "#E6F4EA",
              "error": "#ba1a1a",
              "surface-variant": "#e1e2e4",
              "primary-fixed-dim": "#adc7ff",
              "on-tertiary-fixed": "#341100",
              "neutral-bg": "#F1F3F4",
              "secondary-fixed-dim": "#bdc7d8",
              "secondary": "#555f6d",
              "on-error": "#ffffff",
              "outline": "#727785",
              "surface-container": "#edeef0",
              "on-secondary": "#ffffff",
              "on-primary-fixed-variant": "#004493",
              "border-strong": "#D1D5DB",
              "text-muted": "#9CA3AF",
              "on-background": "#191c1e",
              "on-primary-fixed": "#001a41",
              "neutral-grey": "#5F6368",
              "on-surface": "#191c1e",
              "surface-bright": "#f8f9fb",
              "text-primary": "#0F1117",
              "outline-variant": "#c1c6d6",
              "error-container": "#ffdad6",
              "tertiary": "#9e4300",
              "flagged-bg": "#FEF3C7",
              "secondary-container": "#d6e0f1",
              "surface-tint": "#005bc0",
              "tertiary-fixed-dim": "#ffb691",
              "surface-container-low": "#f2f4f6",
              "inverse-primary": "#adc7ff",
              "tertiary-fixed": "#ffdbcb",
              "on-tertiary-fixed-variant": "#783100",
              "on-secondary-container": "#596372",
              "at-risk-bg": "#FCE8E6",
              "inverse-on-surface": "#f0f1f3",
              "secondary-fixed": "#d9e3f4",
              "tertiary-container": "#c55500",
              "surface-container-highest": "#e1e2e4",
              "on-error-container": "#93000a",
              "background": "#f8f9fb",
              "surface-container-high": "#e7e8ea",
              "on-primary": "#ffffff",
              "inverse-surface": "#2e3132",
              "flagged-amber": "#B45309",
              "verified-green": "#137333",
              "on-secondary-fixed-variant": "#3e4755",
              "on-surface-variant": "#414754",
              "primary-fixed": "#d8e2ff",
              "on-tertiary": "#ffffff",
              "surface": "#f8f9fb",
              "on-secondary-fixed": "#121c28",
              "surface-dim": "#d9dadc",
              "on-tertiary-container": "#0e0200",
              "on-primary-container": "#ffffff",
              "primary": "#005bbf",
              "primary-container": "#1a73e8",
              "surface-container-lowest": "#ffffff",
              "at-risk-red": "#C5221F"
      },
      "borderRadius": {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
      },
      "spacing": {
              "gutter": "24px",
              "card-padding": "24px",
              "unit": "4px",
              "max-width": "1200px",
              "margin-tablet": "48px",
              "margin-mobile": "24px",
              "component-gap": "8px",
              "margin-desktop": "80px"
      },
      "fontFamily": {
              "title-sm": [
                      "Plus Jakarta Sans"
              ],
              "title-md": [
                      "Plus Jakarta Sans"
              ],
              "label-md": [
                      "Inter"
              ],
              "headline-kpi-mobile": [
                      "Plus Jakarta Sans"
              ],
              "headline-kpi": [
                      "Plus Jakarta Sans"
              ],
              "display-landing": [
                      "Plus Jakarta Sans"
              ],
              "display-hero": [
                      "Plus Jakarta Sans"
              ],
              "data-mono": [
                      "jetbrainsMono"
              ],
              "title-lg": [
                      "Plus Jakarta Sans"
              ],
              "body-base": [
                      "Inter"
              ],
              "label-sm": [
                      "Inter"
              ]
      },
      "fontSize": {
              "title-sm": [
                      "17px",
                      {
                              "lineHeight": "26px",
                              "fontWeight": "600"
                      }
              ],
              "title-md": [
                      "20px",
                      {
                              "lineHeight": "30px",
                              "fontWeight": "600"
                      }
              ],
              "label-md": [
                      "13px",
                      {
                              "lineHeight": "20px",
                              "fontWeight": "500"
                      }
              ],
              "headline-kpi-mobile": [
                      "24px",
                      {
                              "lineHeight": "32px",
                              "fontWeight": "700"
                      }
              ],
              "headline-kpi": [
                      "32px",
                      {
                              "lineHeight": "40px",
                              "fontWeight": "700"
                      }
              ],
              "display-landing": [
                      "48px",
                      {
                              "lineHeight": "56px",
                              "letterSpacing": "-0.02em",
                              "fontWeight": "700"
                      }
              ],
              "display-hero": [
                      "64px",
                      {
                              "lineHeight": "72px",
                              "letterSpacing": "-0.02em",
                              "fontWeight": "700"
                      }
              ],
              "data-mono": [
                      "13px",
                      {
                              "lineHeight": "20px",
                              "fontWeight": "400"
                      }
              ],
              "title-lg": [
                      "24px",
                      {
                              "lineHeight": "32px",
                              "fontWeight": "600"
                      }
              ],
              "body-base": [
                      "15px",
                      {
                              "lineHeight": "24px",
                              "fontWeight": "400"
                      }
              ],
              "label-sm": [
                      "11px",
                      {
                              "lineHeight": "16px",
                              "letterSpacing": "0.05em",
                              "fontWeight": "600"
                      }
              ]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}

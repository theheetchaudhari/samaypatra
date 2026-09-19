---
name: samaypatra-design-system
description: Design system guidelines, semantic color palette, typography roles, and visual tokens for the SAMAYPATRA application.
---

# SAMAYPATRA Design System

The SAMAYPATRA design system creates an editorial, grounded, and intelligent visual environment tailored for students handling academic schedules, assignment instructions, and deadlines. It deliberately avoids ephemeral AI trends (purple glows, neon glassmorphism) in favor of warmth, clarity, and trust.

---

## 1. Core Visual Personality

- **Warm & Grounded**: Earthy, organic tones anchored in deep greens and rich cornsilk.
- **Intelligent & Editorial**: Distinctive typographic contrast between classical serif headlines and crisp modern sans-serif UI.
- **Student-Friendly & Focused**: Clear hierarchies, high legibility, and distraction-free review interfaces.
- **Trustworthy & Transparent**: Dedicated presentation for source evidence, validation status, and user confirmation.

---

## 2. Color Palette & Semantic Roles

The palette is composed of five curated colors. Apply them with restraint and purpose—never splash all colors across every screen.

| Token Name | Hex Code | Swatch / Name | Semantic Roles |
| :--- | :--- | :--- | :--- |
| `--color-black-forest` | `#283618` | **Black Forest** | Primary dark background, high-contrast headings, primary text, navigation emphasis |
| `--color-olive-leaf` | `#606C38` | **Olive Leaf** | Primary brand accent, secondary buttons/actions, positive/validated states, active indicators |
| `--color-cornsilk` | `#FEFAE0` | **Cornsilk** | Primary warm page background, soft section panels, card canvas, comfortable reading surface |
| `--color-light-caramel`| `#DDA15E` | **Light Caramel** | Subtle surface fills, muted card borders, secondary badges, soft highlights |
| `--color-copper` | `#BC6C25` | **Copper** | High-attention primary CTAs, urgent deadlines, warning badges, action-required alerts |

### CSS Variables Reference
```css
:root {
  /* Brand Palette */
  --color-black-forest: #283618;
  --color-olive-leaf: #606C38;
  --color-cornsilk: #FEFAE0;
  --color-light-caramel: #DDA15E;
  --color-copper: #BC6C25;

  /* Semantic Application */
  --bg-page: #FEFAE0;
  --bg-surface: #FFFFFF;
  --bg-surface-warm: rgba(254, 250, 224, 0.6);
  --bg-dark: #283618;
  
  --text-primary: #283618;
  --text-secondary: #606C38;
  --text-inverse: #FEFAE0;
  --text-muted: rgba(40, 54, 24, 0.65);

  --border-subtle: rgba(221, 161, 94, 0.35);
  --border-focus: #606C38;
  --border-urgent: #BC6C25;

  --action-primary-bg: #BC6C25;
  --action-primary-text: #FEFAE0;
  --action-secondary-bg: #606C38;
  --action-secondary-text: #FEFAE0;
  --action-ghost-hover: rgba(96, 108, 56, 0.1);
}
```

---

## 3. Typography System

Four distinct typefaces work together, each assigned a non-overlapping functional role:

| Font Family | Primary Purpose | Examples |
| :--- | :--- | :--- |
| **DM Serif Display** | Major marketing headlines & expressive titles | Hero headlines, section display titles, primary page titles |
| **Manrope** | Primary UI typography | Body text, navigation links, form labels, inputs, card content, standard buttons |
| **News Cycle** | Small editorial labels & metadata | Section eyebrows, category tags, step indicators, editorial subtitles |
| **Fira Code** | Source evidence & extracted raw data | OCR snippets, parsed JSON payload, timestamp details, raw syllabus excerpts |

### Font Import & Stack
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Fira+Code:wght@400;500;600&family=Manrope:wght@400;500;600;700&family=News+Cycle:wght@400;700&display=swap" rel="stylesheet">
```

```css
:root {
  --font-serif: 'DM Serif Display', Georgia, serif;
  --font-sans: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-editorial: 'News Cycle', sans-serif;
  --font-mono: 'Fira Code', monospace;
}
```

### Typographic Hierarchy Guidelines
- **Page Titles / Hero**: Use `DM Serif Display` with generous line-height and `#283618` coloring.
- **Section Eyebrows**: Use `News Cycle` uppercase (`letter-spacing: 0.08em`, `font-size: 0.8125rem`), colored with `Olive Leaf` or `Copper`.
- **Form Inputs & Button Labels**: Use `Manrope` (font-weight 600) for crisp, readable UI interactions.
- **Source Text & Extracted Data**: Wrap OCR/raw evidence snippets in `Fira Code` with subtle background tinting (`--color-cornsilk` or light neutral tint).

---

## 4. Component Styling Rules

### Primary CTA (Action / Execute)
- Background: `--color-copper` (`#BC6C25`)
- Text: `--color-cornsilk` (`#FEFAE0`)
- Hover: Darker copper shade, subtle lift shadow.
- Usage: Reserved for high-value actions: "Add to Google Calendar", "Confirm & Sync", "Parse Deadline".

### Secondary Action
- Background: `--color-olive-leaf` (`#606C38`) or outline with `--color-olive-leaf` border.
- Text: `--color-cornsilk` (for solid) or `--color-black-forest` (for outline).
- Usage: "Edit Details", "Upload Another File", "Cancel".

### Cards & Ingestion Containers
- Background: Clean warm white (`#FFFFFF`) or soft cornsilk surface (`rgba(254, 250, 224, 0.6)`).
- Borders: Crisp, thin borders using `--color-light-caramel` with opacity (`rgba(221, 161, 94, 0.4)`).
- Radius: Moderate rounding (`8px` to `12px`), avoiding aggressive pill shapes.
- Elevation: Subtle, diffused warm shadows (`box-shadow: 0 4px 20px rgba(40, 54, 24, 0.06)`).

### Evidence & Traceability Display
- Container: Bordered panel with `var(--color-light-caramel)` border.
- Content: `Fira Code` monospaced text highlighting exact extracted lines.
- Indicator: "Extracted from source" badge with `News Cycle` font.

---

## 5. Anti-Patterns & Prohibitions

Do **NOT**:
- Use generic AI purple, neon cyan, or vibrant magenta glow effects.
- Blanket screens in extreme dark glassmorphism with heavy backdrop blurs.
- Apply high-saturation gradients across cards and containers.
- Use `DM Serif Display` for body copy, buttons, or small labels.
- Use `Fira Code` for standard UI labels or navigation.
- Use all five palette colors in a single component; maintain clear foreground/background balance.

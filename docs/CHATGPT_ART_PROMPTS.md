# Art tasks for ChatGPT (image editing)

Claude handles code, testing and deployment. Use these prompts in ChatGPT for image
work, then save the results into the project folder as described. Claude can then
optimise, wire up and test them.

## 1. Rebrand the 30 card fronts (highest priority)

Every card shows "CELESTIAL CROSSINGS" in small capitals in the top banner. Upload
one original PNG at a time from `assets/concept/...` and use:

> Edit this image only in the small text at the very top centre that reads "CELESTIAL CROSSINGS". Replace that text with "MOOJAI" in the same thin, widely letter-spaced gold serif capitals, the same size, colour and position. Do not change anything else: keep the character, frame, gem, colours, lighting and composition pixel-identical. Output the same aspect ratio (2:3 portrait).

Check each result side by side with the original. Reject it if the animal's face or the frame has changed.
Save each one as `assets/concept/moojai-rebrand-v1/<category>-<rank>.png` (for example `love-SSR.png`). Then ask Claude to "optimise the rebranded cards into assets/web/cards".

## 2. Hero card on the reading page (optional)

The site currently covers the baked-in name on `phra-chan-640.webp` with an overlay. For a clean version, upload `assets/concept/thai-phra-chan-v1.png`:

> Replace only the small text at the top centre with "MooJai" in the same style. Keep everything else identical.

## 3. Social share image (optional upgrade)

Claude made `assets/web/og-image.jpg` (1200×630) from existing art. It shows a card that still says "Celestial Crossings". After task 1, Claude can regenerate it automatically. Alternatively, for a bespoke version:

> Create a 1200×630 banner for a Thai fortune website called "มูใจ / MooJai". Use a midnight indigo sky with a crescent moon, distant Thai temple spires, lotus petals and soft lilac clouds. Leave the left 55% dark and empty for text. On the right, fan three portrait cards showing a cute chibi cream moon bunny, a golden kitten and a baby deer in ornate gold Thai frames. The style is painterly, warm gold and lilac. No text.

Claude will add the Thai/English text.

## 4. App icon (optional, for "Add to Home Screen")

> Design a square app icon, 1024×1024, for "MooJai". Show a golden crescent moon with a small four-point star on deep plum (#432338). Use flat but softly painterly shading, a centred symbol and plenty of padding. No text.

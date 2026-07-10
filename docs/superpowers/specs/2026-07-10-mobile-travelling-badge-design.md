# Mobile Travelling Badge Design

## Goal

Keep the existing horizontal Travelling badge on desktop while replacing it below 768px with a compact, accessible entry that fits the navigation drawer.

## Structure

`LeftPanel` keeps one external anchor so keyboard and screen-reader users encounter one focus target. Inside it, the existing image receives a desktop-only class. A mobile-only element contains an inline decorative train icon and the existing localized Travelling label. The icon is hidden from assistive technology and the anchor retains its readable `aria-label`, localized URL, `target`, and `rel` behavior.

## Responsive behavior

Desktop and tablet layouts continue showing the current horizontal badge. The mobile drawer stylesheet, which applies below 768px, hides the desktop image, shows the compact element, removes the 4:1 aspect ratio and fixed badge width, and gives the link a minimum 44 by 44 pixel touch target. Styling reuses existing HUD colors, borders, typography, focus behavior, and inverted-theme variables. No viewport JavaScript or icon dependency is added.

## Verification

Component tests verify that exactly one Travelling anchor exists, the desktop image is decorative, and the localized mobile label and hidden icon are present. Repository checks cover lint, TypeScript, tests, and the production build. Browser verification checks desktop plus 320px, 375px, 390px, and 430px mobile widths for overflow, neighboring news-card layout, and the single focus target.

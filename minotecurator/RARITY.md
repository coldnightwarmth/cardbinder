# Rarity simulation

The studio calculates a rank and normalized score for every card from the current
shared traits and appearance settings. The **Sequence / Rarest first** toolbar
button changes gallery order. Search and tag filters retain collection-wide ranks.
Sorting preserves the selected card, its editor, and its undo history.

This is an OpenRarity simulation, not an official marketplace ranking. The formula
and ranking follow the [OpenRarity reference implementation](https://github.com/OpenRarity/open-rarity/tree/f2bc4d8b6e6eea1dd0a7f57017aa3d87d01fcc43)
(version 0.7.5):

- Each ordinary tag, including custom tags, is a separate present/missing attribute.
  This preserves multiple tags in a category instead of overwriting them or treating
  every combination as a new trait value.
- Body text, name ink (including black), icon type, and icon color use the same
  values as the NFT metadata export. Their derived sidebar tags are not counted again.
- OpenRarity's non-`none` trait-count meta attribute is included. Absent attributes
  contribute their implicit null frequency.
- Information content is the sum of `log2(collection size / value frequency)`.
  The score is this sum divided by the collection's entropy; its collection average
  is 1, or 0 when the collection has no variation.
- Cards sort by unique attribute count first, then descending score. As in the
  reference, scores equal within a relative tolerance of `1e-9` share competition
  ranks. Equal sort keys retain sequence order. Rank 1 is rarest.

Ranks update after tag, icon, body-box, and name-ink edits, including incoming shared
updates. Crop, position, title text, and sequence number do not affect rarity.
Computed ratings are not written back as traits or included in the NFT attributes.

Validation: all 1,430 cards in shared metadata revision 5631 were compared with the
Python reference using the same present/missing representation. Every rank matched,
and every score matched within `1e-12` relative tolerance. Regression tests:
`node --test worker/test/minote-rarity.test.mjs`.

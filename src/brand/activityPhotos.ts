// Representative photos from the 8 October design, shown for a couple of
// sample groups only (Sarah, 9 October): on the group page and on each of the
// group's event pages, always captioned "<activity> · representative photo"
// so nobody takes it for the group's own. Brand content: a cloned board
// brings its own or leaves this empty (docs/cloning.md).
//
// Keyed by group slug. Every other group and event shows no photo.

type SamplePhoto = { label: string; src: string; alt: string };

const mountainBiking: SamplePhoto = {
  label: "Mountain biking",
  src: "/activities/cycling.jpg",
  alt: "Mountain bikers riding singletrack through a forest",
};
const climbing: SamplePhoto = {
  label: "Climbing",
  src: "/activities/climbing.jpg",
  alt: "A climber on a rock face with a belayer below",
};

export const groupPhotos: Record<string, SamplePhoto> = {
  "blue-ridge-dirt-skrrts": mountainBiking,
  "nc-bipoc-climbers": climbing,
};

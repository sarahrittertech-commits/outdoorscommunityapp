// Representative photos for activities, shown on an event page when the
// event has no photo of its own (8 October design). Brand content: a cloned
// board brings its own photos or leaves this empty (docs/cloning.md).
//
// Keyed by category slug. Activities without one show their line drawing.
// Always captioned as representative, never as the group's own photo.

type ActivityPhoto = { label: string; src: string; alt: string };

export const activityPhotos: Record<string, ActivityPhoto> = {
  hiking: { label: "Hiking", src: "/activities/hiking.jpg", alt: "Hikers on a ridge trail in autumn" },
  cycling: { label: "Cycling", src: "/activities/cycling.jpg", alt: "Mountain bikers riding singletrack through a forest" },
  paddling: { label: "Paddling", src: "/activities/paddling.jpg", alt: "Kayakers on a calm mountain lake" },
  climbing: { label: "Climbing", src: "/activities/climbing.jpg", alt: "A climber on a rock face with a belayer below" },
  running: { label: "Running", src: "/activities/running.jpg", alt: "Trail runners on red rock at sunrise" },
  camping: { label: "Camping", src: "/activities/camping.jpg", alt: "Campers around a fire under the night sky" },
  snow: { label: "Snow sports", src: "/activities/snow.jpg", alt: "Skiers at the top of a groomed run" },
};

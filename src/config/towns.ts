// Towns the board can measure distance from (UC-14, UC-15). Deployment
// specific: a board for another region replaces this list (docs/cloning.md).
//
// Location search never asks for the visitor's device location. People pick
// a town; distances are measured between town centers, so they are
// approximate ("about 25 miles"), which is all a group listing needs.
//
// A group's free-text `area` is matched to a town by name (see townForArea in
// lib/geo). Areas with no single town ("Western North Carolina", "National")
// simply have no distance and don't appear on the map.

export type Town = {
  name: string;
  /** Shown after the name where it helps, e.g. "VA". */
  state: string;
  lat: number;
  lng: number;
  /** Other ways a group's area might name the same place. */
  aliases?: string[];
};

export const towns: Town[] = [
  { name: "Asheville", state: "NC", lat: 35.5951, lng: -82.5515, aliases: ["Buncombe County"] },
  { name: "West Asheville", state: "NC", lat: 35.579, lng: -82.596 },
  { name: "Black Mountain", state: "NC", lat: 35.6179, lng: -82.3212 },
  { name: "Weaverville", state: "NC", lat: 35.697, lng: -82.5607 },
  { name: "Marshall", state: "NC", lat: 35.7973, lng: -82.6843 },
  { name: "Brevard", state: "NC", lat: 35.2334, lng: -82.7343 },
  { name: "DuPont State Forest", state: "NC", lat: 35.2087, lng: -82.6155 },
  { name: "Etowah", state: "NC", lat: 35.3176, lng: -82.5937 },
  { name: "Hendersonville", state: "NC", lat: 35.3187, lng: -82.461 },
  { name: "Waynesville", state: "NC", lat: 35.4887, lng: -82.9887 },
  { name: "Sylva", state: "NC", lat: 35.3737, lng: -83.226 },
  { name: "Bryson City", state: "NC", lat: 35.4282, lng: -83.4474 },
  { name: "Robbinsville", state: "NC", lat: 35.3229, lng: -83.8074 },
  { name: "Hayesville", state: "NC", lat: 35.0462, lng: -83.8179 },
  { name: "Franklin", state: "NC", lat: 35.1823, lng: -83.3815 },
  { name: "Highlands", state: "NC", lat: 35.0526, lng: -83.1968 },
  { name: "Cashiers", state: "NC", lat: 35.1104, lng: -83.0937 },
  { name: "Sapphire", state: "NC", lat: 35.0626, lng: -83.0018 },
  { name: "Panthertown Valley", state: "NC", lat: 35.166, lng: -83.035 },
  { name: "Lake Lure", state: "NC", lat: 35.4276, lng: -82.2045 },
  { name: "Rutherfordton", state: "NC", lat: 35.3693, lng: -81.9568, aliases: ["Rutherford County"] },
  { name: "Morganton", state: "NC", lat: 35.7454, lng: -81.6848 },
  { name: "Lenoir", state: "NC", lat: 35.914, lng: -81.539 },
  { name: "Spruce Pine", state: "NC", lat: 35.9154, lng: -82.0646 },
  { name: "Burnsville", state: "NC", lat: 35.9171, lng: -82.301 },
  { name: "Boone", state: "NC", lat: 36.2168, lng: -81.6746 },
  { name: "Blowing Rock", state: "NC", lat: 36.1351, lng: -81.6779 },
  { name: "Banner Elk", state: "NC", lat: 36.1632, lng: -81.8715 },
  { name: "North Wilkesboro", state: "NC", lat: 36.1585, lng: -81.1476 },
  { name: "Elkin", state: "NC", lat: 36.2443, lng: -80.8484 },
  { name: "Winston-Salem", state: "NC", lat: 36.0999, lng: -80.2442 },
  { name: "Kernersville", state: "NC", lat: 36.1199, lng: -80.0737 },
  { name: "Greensboro", state: "NC", lat: 36.0726, lng: -79.792 },
  { name: "Lexington", state: "NC", lat: 35.824, lng: -80.2534 },
  { name: "Granite Quarry", state: "NC", lat: 35.6129, lng: -80.4495 },
  { name: "Mooresville", state: "NC", lat: 35.5849, lng: -80.8101 },
  { name: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431 },
  { name: "Robbins", state: "NC", lat: 35.4335, lng: -79.5867 },
  { name: "Hillsborough", state: "NC", lat: 36.0754, lng: -79.0997 },
  { name: "Carrboro", state: "NC", lat: 35.9101, lng: -79.0753 },
  { name: "Durham", state: "NC", lat: 35.994, lng: -78.8986 },
  { name: "Roxboro", state: "NC", lat: 36.3938, lng: -78.9828 },
  { name: "Raleigh", state: "NC", lat: 35.7796, lng: -78.6382 },
  { name: "Cary", state: "NC", lat: 35.7915, lng: -78.7811 },
  { name: "Fayetteville", state: "NC", lat: 35.0527, lng: -78.8784 },
  { name: "Fort Bragg", state: "NC", lat: 35.139, lng: -79.006, aliases: ["Fort Liberty"] },
  { name: "Piney Green", state: "NC", lat: 34.716, lng: -77.32 },
  { name: "Sea Breeze", state: "NC", lat: 34.0582, lng: -77.8946 },
  { name: "New River Valley", state: "VA", lat: 37.2296, lng: -80.4139, aliases: ["New River Valley, Virginia"] },
  { name: "Red River Gorge", state: "KY", lat: 37.826, lng: -83.61, aliases: ["Red River Gorge, Kentucky"] },
];

/** The town the home page's *Near you* row starts from. */
export const defaultTown = "Asheville";

/** Distance choices on the search forms, in miles. */
export const distances = [10, 25, 50, 100, 250] as const;

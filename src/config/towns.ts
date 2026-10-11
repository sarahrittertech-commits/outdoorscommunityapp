// Towns the board can measure distance from (UC-14, UC-15), each in the
// region it belongs to (src/config/regions.ts). Deployment specific: a board
// for other regions replaces this list (docs/cloning.md).
//
// Location search never asks for the visitor's device location. People pick
// a town; distances are measured between town centers, so they are
// approximate ("about 25 miles"), which is all a group listing needs.
//
// A group's free-text `area` is matched to a town by name (see townForArea in
// lib/geo). Areas with no single town ("Western North Carolina", "National")
// simply have no distance and don't appear on the map.
//
// Names are unique by name and state. A name used in two states
// (Fayetteville, NC and Fayetteville, WV) is saved and shown with its state
// ("Fayetteville, WV"); the plain name still finds the default region's town,
// so values saved before regions existed keep meaning what they meant.

export type Town = {
  name: string;
  /** Two-letter state, shown after the name: "Brevard, NC". */
  state: string;
  lat: number;
  lng: number;
  /**
   * Slug of the region the town is in. A town outside every region still
   * works for distance search; it just isn't listed under a region or shown
   * on a region's map.
   */
  region?: string;
  /** Other ways a group's area might name the same place. */
  aliases?: string[];
};

type Row = [name: string, state: string, lat: number, lng: number, aliases?: string[]];

function inRegion(region: string | undefined, rows: Row[]): Town[] {
  return rows.map(([name, state, lat, lng, aliases]) => ({ name, state, lat, lng, region, ...(aliases ? { aliases } : {}) }));
}

export const towns: Town[] = [
  ...inRegion("western-nc", [
    ["Asheville", "NC", 35.5951, -82.5515, ["Buncombe County"]],
    ["West Asheville", "NC", 35.579, -82.596],
    ["Black Mountain", "NC", 35.6179, -82.3212],
    ["Weaverville", "NC", 35.697, -82.5607],
    ["Marshall", "NC", 35.7973, -82.6843],
    ["Brevard", "NC", 35.2334, -82.7343],
    ["DuPont State Forest", "NC", 35.2087, -82.6155],
    ["Etowah", "NC", 35.3176, -82.5937],
    ["Hendersonville", "NC", 35.3187, -82.461],
    ["Waynesville", "NC", 35.4887, -82.9887],
    ["Sylva", "NC", 35.3737, -83.226],
    ["Bryson City", "NC", 35.4282, -83.4474],
    ["Robbinsville", "NC", 35.3229, -83.8074],
    ["Hayesville", "NC", 35.0462, -83.8179],
    ["Franklin", "NC", 35.1823, -83.3815],
    ["Highlands", "NC", 35.0526, -83.1968],
    ["Cashiers", "NC", 35.1104, -83.0937],
    ["Sapphire", "NC", 35.0626, -83.0018],
    ["Panthertown Valley", "NC", 35.166, -83.035],
    ["Lake Lure", "NC", 35.4276, -82.2045],
    ["Rutherfordton", "NC", 35.3693, -81.9568, ["Rutherford County"]],
    ["Morganton", "NC", 35.7454, -81.6848],
    ["Lenoir", "NC", 35.914, -81.539],
    ["Spruce Pine", "NC", 35.9154, -82.0646],
    ["Burnsville", "NC", 35.9171, -82.301],
    ["Boone", "NC", 36.2168, -81.6746],
    ["Blowing Rock", "NC", 36.1351, -81.6779],
    ["Banner Elk", "NC", 36.1632, -81.8715],
    ["North Wilkesboro", "NC", 36.1585, -81.1476],
    // The western Piedmont is nearer Asheville than Raleigh.
    ["Elkin", "NC", 36.2443, -80.8484],
    ["Mooresville", "NC", 35.5849, -80.8101],
    ["Charlotte", "NC", 35.2271, -80.8431],
  ]),
  ...inRegion("front-range", [
    ["Denver", "CO", 39.74, -104.99],
    ["Boulder", "CO", 40.01, -105.27],
    ["Golden", "CO", 39.76, -105.22],
    ["Arvada", "CO", 39.8, -105.09],
    ["Westminster", "CO", 39.84, -105.04],
    ["Thornton", "CO", 39.87, -104.97],
    ["Broomfield", "CO", 39.92, -105.09],
    ["Lakewood", "CO", 39.7, -105.08],
    ["Englewood", "CO", 39.65, -104.99],
    ["Littleton", "CO", 39.61, -105.02],
    ["Highlands Ranch", "CO", 39.55, -104.97],
    ["Aurora", "CO", 39.73, -104.83],
    ["Parker", "CO", 39.52, -104.76],
    ["Castle Rock", "CO", 39.37, -104.86],
    ["Colorado Springs", "CO", 38.83, -104.82],
    ["Morrison", "CO", 39.65, -105.19],
    ["Evergreen", "CO", 39.63, -105.32],
    ["Idaho Springs", "CO", 39.74, -105.51],
    ["Nederland", "CO", 39.96, -105.51],
    ["Superior", "CO", 39.95, -105.17],
    ["Louisville", "CO", 39.98, -105.13],
    ["Lafayette", "CO", 39.99, -105.09],
    ["Erie", "CO", 40.05, -105.05],
    ["Longmont", "CO", 40.17, -105.1],
    ["Lyons", "CO", 40.22, -105.27],
    ["Estes Park", "CO", 40.38, -105.52],
    ["Loveland", "CO", 40.4, -105.07],
    ["Greeley", "CO", 40.42, -104.71],
    ["Fort Collins", "CO", 40.59, -105.08],
  ]),
  ...inRegion("triangle", [
    ["Raleigh", "NC", 35.7796, -78.6382, ["Wake County"]],
    ["Durham", "NC", 35.994, -78.8986],
    ["Chapel Hill", "NC", 35.91, -79.06],
    ["Carrboro", "NC", 35.9101, -79.0753],
    ["Cary", "NC", 35.7915, -78.7811],
    ["Apex", "NC", 35.73, -78.85],
    ["Morrisville", "NC", 35.82, -78.83],
    ["Wake Forest", "NC", 35.98, -78.51],
    ["Rolesville", "NC", 35.92, -78.46],
    ["Knightdale", "NC", 35.79, -78.48],
    ["Wendell", "NC", 35.78, -78.37],
    ["Zebulon", "NC", 35.82, -78.31],
    ["Garner", "NC", 35.71, -78.61],
    ["Clayton", "NC", 35.65, -78.46],
    ["Smithfield", "NC", 35.51, -78.34],
    ["Holly Springs", "NC", 35.65, -78.83],
    ["Fuquay-Varina", "NC", 35.58, -78.8],
    ["Pittsboro", "NC", 35.72, -79.18],
    ["Siler City", "NC", 35.72, -79.46],
    ["Sanford", "NC", 35.48, -79.18],
    ["Hillsborough", "NC", 36.0754, -79.0997],
    ["Mebane", "NC", 36.1, -79.27],
    ["Creedmoor", "NC", 36.12, -78.68],
    ["Henderson", "NC", 36.33, -78.4],
    ["Louisburg", "NC", 36.1, -78.3],
    ["Roxboro", "NC", 36.3938, -78.9828],
    // The Triad, the Sandhills and the coast are nearer Raleigh than Asheville.
    ["Winston-Salem", "NC", 36.0999, -80.2442],
    ["Kernersville", "NC", 36.1199, -80.0737],
    ["Greensboro", "NC", 36.0726, -79.792],
    ["Lexington", "NC", 35.824, -80.2534],
    ["Granite Quarry", "NC", 35.6129, -80.4495],
    ["Robbins", "NC", 35.4335, -79.5867],
    ["Fayetteville", "NC", 35.0527, -78.8784],
    ["Fort Bragg", "NC", 35.139, -79.006, ["Fort Liberty"]],
    ["Piney Green", "NC", 34.716, -77.32],
    ["Sea Breeze", "NC", 34.0582, -77.8946],
  ]),
  ...inRegion("puget-sound", [
    ["Seattle", "WA", 47.61, -122.33, ["King County"]],
    ["Bellingham", "WA", 48.75, -122.48, ["Whatcom County"]],
    ["Bellevue", "WA", 47.61, -122.2],
    ["Redmond", "WA", 47.67, -122.12],
    ["Kirkland", "WA", 47.68, -122.21],
    ["Bothell", "WA", 47.76, -122.21],
    ["Renton", "WA", 47.48, -122.22],
    ["Issaquah", "WA", 47.53, -122.03],
    ["North Bend", "WA", 47.5, -121.79],
    ["Bainbridge Island", "WA", 47.63, -122.52],
    ["Edmonds", "WA", 47.81, -122.38],
    ["Lynnwood", "WA", 47.82, -122.32],
    ["Everett", "WA", 47.98, -122.2],
    ["Snohomish", "WA", 47.91, -122.1],
    ["Monroe", "WA", 47.86, -121.97],
    ["Marysville", "WA", 48.05, -122.18],
    ["Arlington", "WA", 48.2, -122.13],
    ["Tacoma", "WA", 47.25, -122.44],
    ["Gig Harbor", "WA", 47.33, -122.58],
    ["Olympia", "WA", 47.04, -122.9],
    ["Port Townsend", "WA", 48.12, -122.76],
    ["Oak Harbor", "WA", 48.29, -122.64],
    ["Anacortes", "WA", 48.51, -122.61],
    ["Mount Vernon", "WA", 48.42, -122.33, ["Skagit County"]],
    ["Burlington", "WA", 48.48, -122.33],
    ["Sedro-Woolley", "WA", 48.5, -122.24],
    ["Ferndale", "WA", 48.85, -122.59],
    ["Lynden", "WA", 48.95, -122.45],
    ["Glacier", "WA", 48.89, -121.94, ["Mount Baker"]],
  ]),
  ...inRegion("new-river-gorge", [
    ["Fayetteville", "WV", 38.05, -81.1, ["New River Gorge"]],
    ["Lansing", "WV", 38.1, -81.05],
    ["Ansted", "WV", 38.14, -81.1],
    ["Hico", "WV", 38.11, -80.95],
    ["Gauley Bridge", "WV", 38.17, -81.19],
    ["Montgomery", "WV", 38.18, -81.33],
    ["Summersville", "WV", 38.28, -80.85],
    ["Richwood", "WV", 38.22, -80.53],
    ["Oak Hill", "WV", 37.97, -81.15],
    ["Mount Hope", "WV", 37.9, -81.16],
    ["Thurmond", "WV", 37.96, -81.08],
    ["Beckley", "WV", 37.78, -81.19],
    ["Hinton", "WV", 37.67, -80.89],
    ["Alderson", "WV", 37.73, -80.64],
    ["Lewisburg", "WV", 37.8, -80.45],
    ["White Sulphur Springs", "WV", 37.8, -80.3],
    ["Princeton", "WV", 37.37, -81.1],
    ["Bluefield", "WV", 37.27, -81.22],
    ["Charleston", "WV", 38.35, -81.63],
    // Blacksburg and Radford, Virginia: about 70 miles from the gorge.
    ["New River Valley", "VA", 37.2296, -80.4139, ["New River Valley, Virginia"]],
  ]),
  ...inRegion("east-tennessee", [
    ["Knoxville", "TN", 35.96, -83.92, ["Knox County"]],
    ["Farragut", "TN", 35.88, -84.15],
    ["Alcoa", "TN", 35.79, -83.97],
    ["Maryville", "TN", 35.76, -83.97],
    ["Townsend", "TN", 35.67, -83.76],
    ["Sevierville", "TN", 35.87, -83.56],
    ["Pigeon Forge", "TN", 35.79, -83.55],
    ["Gatlinburg", "TN", 35.71, -83.51],
    ["Newport", "TN", 35.97, -83.19],
    ["Jefferson City", "TN", 36.12, -83.49],
    ["Morristown", "TN", 36.21, -83.29],
    ["Greeneville", "TN", 36.16, -82.83],
    ["Johnson City", "TN", 36.31, -82.35],
    ["Elizabethton", "TN", 36.35, -82.21],
    ["Erwin", "TN", 36.15, -82.42],
    ["Kingsport", "TN", 36.55, -82.56],
    ["Oak Ridge", "TN", 36.01, -84.27],
    ["Oliver Springs", "TN", 36.04, -84.34],
    ["Clinton", "TN", 36.1, -84.13],
    ["Norris", "TN", 36.2, -84.07],
    ["Andersonville", "TN", 36.19, -84.07],
    ["LaFollette", "TN", 36.38, -84.12],
    ["Lenoir City", "TN", 35.8, -84.26],
    ["Madisonville", "TN", 35.52, -84.36],
    ["Tellico Plains", "TN", 35.36, -84.3],
    ["Chattanooga", "TN", 35.05, -85.31],
  ]),
  // In no region (about 130 miles from Knoxville): kept so groups already
  // listed there keep a distance.
  ...inRegion(undefined, [["Red River Gorge", "KY", 37.826, -83.61, ["Red River Gorge, Kentucky"]]]),
];

/** Distance choices on the search forms, in miles. */
export const distances = [10, 25, 50, 100, 250] as const;

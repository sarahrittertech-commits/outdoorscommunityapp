// US zip codes the location search understands (FR-BR-12). Deployment
// specific: a board for another region replaces this list along with
// towns.ts (docs/cloning.md).
//
// Each zip code maps to the name of a town in towns.ts: the town itself, or
// the nearest one for a smaller place nearby (Pisgah Forest counts as
// Brevard). Distances then work exactly as they do for that town, measured
// from its center, so they stay approximate. No outside service is ever
// asked; a zip code not listed here is reported as unknown.

export const zipTowns: Record<string, string> = {
  // Buncombe County
  "28801": "Asheville",
  "28802": "Asheville",
  "28803": "Asheville",
  "28804": "Asheville",
  "28805": "Asheville",
  "28806": "West Asheville",
  "28704": "Asheville", // Arden
  "28715": "West Asheville", // Candler
  "28748": "West Asheville", // Leicester
  "28711": "Black Mountain",
  "28778": "Black Mountain", // Swannanoa
  "28730": "Black Mountain", // Fairview
  "28787": "Weaverville",
  "28709": "Weaverville", // Barnardsville
  // Madison County
  "28753": "Marshall",
  "28754": "Marshall", // Mars Hill
  "28743": "Marshall", // Hot Springs
  // Transylvania County
  "28712": "Brevard",
  "28768": "Brevard", // Pisgah Forest
  "28772": "Brevard", // Rosman
  "28718": "DuPont State Forest", // Cedar Mountain
  "28747": "Sapphire", // Lake Toxaway
  // Henderson and Polk counties
  "28729": "Etowah",
  "28742": "Etowah", // Horse Shoe
  "28759": "Etowah", // Mills River
  "28739": "Hendersonville",
  "28791": "Hendersonville",
  "28792": "Hendersonville",
  "28731": "Hendersonville", // Flat Rock
  "28732": "Hendersonville", // Fletcher
  "28773": "Hendersonville", // Saluda
  "28782": "Hendersonville", // Tryon
  "28722": "Hendersonville", // Columbus
  // Haywood County
  "28785": "Waynesville",
  "28786": "Waynesville",
  "28716": "Waynesville", // Canton
  "28721": "Waynesville", // Clyde
  "28751": "Waynesville", // Maggie Valley
  // Jackson, Swain, Graham, Clay, Cherokee and Macon counties
  "28779": "Sylva",
  "28723": "Sylva", // Cullowhee
  "28725": "Sylva", // Dillsboro
  "28713": "Bryson City",
  "28719": "Bryson City", // Cherokee
  "28771": "Robbinsville",
  "28904": "Hayesville",
  "28906": "Hayesville", // Murphy
  "28734": "Franklin",
  "28741": "Highlands",
  "28717": "Cashiers",
  "28774": "Sapphire",
  // Rutherford and McDowell counties
  "28746": "Lake Lure",
  "28720": "Lake Lure", // Chimney Rock
  "28139": "Rutherfordton",
  "28043": "Rutherfordton", // Forest City
  "28762": "Black Mountain", // Old Fort
  "28752": "Morganton", // Marion
  // Burke, Caldwell, Mitchell, Yancey counties
  "28655": "Morganton",
  "28645": "Lenoir",
  "28601": "Lenoir", // Hickory
  "28777": "Spruce Pine",
  "28749": "Spruce Pine", // Little Switzerland
  "28705": "Spruce Pine", // Bakersville
  "28714": "Burnsville",
  // The High Country
  "28607": "Boone",
  "28608": "Boone",
  "28691": "Boone", // Valle Crucis
  "28694": "Boone", // West Jefferson
  "28605": "Blowing Rock",
  "28604": "Banner Elk",
  "28657": "Banner Elk", // Newland
  "28646": "Banner Elk", // Linville
  "28659": "North Wilkesboro",
  "28621": "Elkin",
  // The Piedmont and beyond, where the board lists groups
  "27101": "Winston-Salem",
  "27103": "Winston-Salem",
  "27104": "Winston-Salem",
  "27284": "Kernersville",
  "27401": "Greensboro",
  "27403": "Greensboro",
  "27408": "Greensboro",
  "27292": "Lexington",
  "28072": "Granite Quarry",
  "28115": "Mooresville",
  "28117": "Mooresville",
  "28202": "Charlotte",
  "28203": "Charlotte",
  "28204": "Charlotte",
  "28205": "Charlotte",
  "28207": "Charlotte",
  "28209": "Charlotte",
  "27325": "Robbins",
  "27278": "Hillsborough",
  "27510": "Carrboro",
  "27701": "Durham",
  "27705": "Durham",
  "27707": "Durham",
  "27573": "Roxboro",
  "27601": "Raleigh",
  "27603": "Raleigh",
  "27605": "Raleigh",
  "27608": "Raleigh",
  "27511": "Cary",
  "27513": "Cary",
  "27518": "Cary",
  "28301": "Fayetteville",
  "28303": "Fayetteville",
  "28305": "Fayetteville",
  "28310": "Fort Bragg",
};

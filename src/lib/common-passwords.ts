// FR-AC-17: passwords refused because they top every leaked-password list.
// Only entries of 10 or more characters are listed: anything shorter is
// already refused by the length rule. Compared ignoring case and spaces at
// the ends. Supabase's leaked-password check (Have I Been Pwned) needs the
// Pro plan; this short list stands in until then (ADR-0009).

const LIST = [
  "0000000000", "0123456789", "0987654321", "1111111111", "1122334455",
  "1234512345", "1234554321", "1234567890", "12345678910", "1234567890a",
  "1234567890q", "123456789a", "123456789q", "1234qwerasdf", "1234qwerasdfzxcv",
  "123qweasdzxc", "1a2b3c4d5e", "1q2w3e4r5t", "1q2w3e4r5t6y", "1qaz2wsx3edc",
  "1qazxsw23edc", "a123456789", "a1b2c3d4e5", "aa12345678", "abc1234567",
  "abcd123456", "abcdefg123", "abcdefghij", "admin12345", "admin123456",
  "adminadmin", "administrator", "asdfasdfasdf", "asdfghjkl1", "asdfghjkl123",
  "autumn2026", "baseball123", "basketball", "basketball1", "basketball123",
  "batman1234", "branchoutdoors", "butterfly1", "butterfly123", "changeme123",
  "charlie123", "chocolate1", "chocolate123", "computer123", "dragon1234",
  "football123", "freedom123", "fuckyou123", "hiking1234", "iloveyou12",
  "iloveyou123", "iloveyou1234", "jennifer123", "letmein123", "letmein1234",
  "liverpool1", "liverpool123", "loveyou1234", "manchester", "manchester1",
  "master1234", "michael123", "monkey1234", "mypassword", "mypassword1",
  "newpassword", "outdoors123", "p@ssw0rd123", "p@ssword123", "passw0rd123",
  "password!1", "password10", "password11", "password12", "password123",
  "password123!", "password1234", "password12345", "passwordpassword", "pokemon123",
  "princess123", "q1w2e3r4t5", "q1w2e3r4t5y6", "qazwsxedc123", "qazwsxedcrfv",
  "qwerty123!", "qwerty1234", "qwerty12345", "qwerty123456", "qwertyqwerty",
  "qwertyuiop", "qwertyuiop123", "shadow1234", "spring2026", "starwars123",
  "summer2024", "summer2025", "summer2026", "sunshine123", "superman123",
  "trustno1234", "welcome123", "welcome1234", "welcome2024", "welcome2025",
  "welcome2026", "whatever123", "winter2026", "zaq12wsxcde3", "zxcvbnm123",
  "zxcvbnmasdfghjkl",
];

export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(LIST);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.trim().toLowerCase());
}

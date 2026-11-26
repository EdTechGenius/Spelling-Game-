// Public Supabase settings. The publishable key is designed to be public — it only
// allows what the database security rules (RLS) permit.
export const SUPABASE_URL = 'https://yhtmhtmvcvvjxahbvjav.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_WXU6oBACiEZG8U8tQQT4nw_wtzhdCvW';

// How many days after passing a Challenge a word comes back for its Check.
// Add ?dev to the address to make Checks available straight away for testing.
export const CHECK_DELAY_DAYS = new URLSearchParams(location.search).has('dev') ? 0 : 2;

// Let people try the game without signing in (progress stays on that device only).
export const ALLOW_GUEST = true;

export const CHALLENGE_SIZE = 10;   // words per Challenge
export const PRACTISE_SIZE = 8;     // words per practice game

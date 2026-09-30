// Template for an auto-fetcher. It is not used until you add it to the list in index.js.
//
// Only write one for a source whose terms allow automated access.

export default {
  id: 'example', // short name used in the URL: /api/fetch/example
  name: 'Example Careers Feed', // shown on the button in the quest board
  permission: 'Public RSS feed; terms checked on YYYY-MM-DD', // why this is allowed

  // Download the data and return a list of quests.
  // `signal` cancels the request if it takes too long - pass it to fetch().
  async fetch(signal) {
    const response = await fetch('https://example.com/feed.json', { signal });
    if (!response.ok) throw new Error(`Source replied with status ${response.status}`);
    const items = await response.json();

    // Every quest needs these fields. deadline is 'YYYY-MM-DD' or null.
    return items.map((item) => ({
      company: item.company,
      role: item.title,
      type: 'summer', // spring-week | summer | off-cycle | grad
      division: '',
      deadline: item.closingDate ?? null,
      rolling: false,
      link: item.url,
    }));
  },
};

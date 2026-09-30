// Tests for paste import and CSV import. Run with:  npm test
// Note: these use made-up samples. Real sites lay things out in their own way,
// which is why the import window shows an editable preview.

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, detectType, detectDivision, textToGrid, gridToQuests, parseBlocks, parsePaste } from '../src/importers/pasteParser.js';
import { parseCsv, csvToQuests, CSV_TEMPLATE } from '../src/importers/csvParser.js';

const TODAY = '2026-09-30';
const options = { today: TODAY, defaultType: 'summer' };

test('parseDate understands common UK formats', () => {
  assert.equal(parseDate('2026-11-30', TODAY), '2026-11-30');
  assert.equal(parseDate('30/11/2026', TODAY), '2026-11-30');
  assert.equal(parseDate('05/01/27', TODAY), '2027-01-05'); // day first, UK style
  assert.equal(parseDate('30 Nov 2026', TODAY), '2026-11-30');
  assert.equal(parseDate('Deadline: 30th November 2026', TODAY), '2026-11-30');
  assert.equal(parseDate('Nov 30, 2026', TODAY), '2026-11-30');
  assert.equal(parseDate('Closes 3 Sept 2026', TODAY), '2026-09-03');
});

test('parseDate guesses the year when it is missing', () => {
  assert.equal(parseDate('30 Nov', TODAY), '2026-11-30'); // still to come this year
  assert.equal(parseDate('15 Jan', TODAY), '2027-01-15'); // long gone this year -> next year
  assert.equal(parseDate('20 Sep', TODAY), '2026-09-20'); // only just passed
});

test('parseDate ignores things that are not dates', () => {
  assert.equal(parseDate('2027 Summer Analyst', TODAY), null);
  assert.equal(parseDate('Top 10 Analyst roles', TODAY), null);
  assert.equal(parseDate('31/02/2026', TODAY), null);
  assert.equal(parseDate('', TODAY), null);
  assert.equal(parseDate('Global Markets', TODAY), null);
});

test('type and division are guessed from the role title', () => {
  assert.equal(detectType('2027 Spring Insight Week'), 'spring-week');
  assert.equal(detectType('Off-Cycle Internship'), 'off-cycle');
  assert.equal(detectType('2027 Summer Analyst'), 'summer');
  assert.equal(detectType('Graduate Analyst Programme'), 'grad');
  assert.equal(detectType('Analyst'), null);
  assert.equal(detectDivision('Summer Analyst - Investment Banking'), 'Investment Banking');
  assert.equal(detectDivision('Global Markets Summer Internship'), 'Markets');
  assert.equal(detectDivision('Asset Management Spring Week'), 'Asset Management');
  assert.equal(detectDivision('Summer Analyst'), '');
});

test('tab-separated table with a header row', () => {
  const text = [
    'Company\tProgramme name\tOpening date\tClosing date\tLast year opening\tCV\tCover letter\tLink',
    'Alpha Bank\t2027 Summer Analyst - Investment Banking\t01/09/2026\t30/11/2026\t03/09/2025\tYes\tNo\thttps://alpha.example/apply',
    'Beta Capital\tSpring Insight Week\t15 Sep 2026\tRolling\t\tYes\tOptional\thttps://beta.example/spring',
  ].join('\n');
  const quests = gridToQuests(textToGrid(text), options);
  assert.equal(quests.length, 2);
  assert.deepEqual(quests[0], {
    company: 'Alpha Bank',
    role: '2027 Summer Analyst - Investment Banking',
    type: 'summer',
    division: 'Investment Banking',
    deadline: '2026-11-30', // the closing date, not the opening or last year's
    rolling: false,
    link: 'https://alpha.example/apply',
  });
  assert.equal(quests[1].type, 'spring-week');
  assert.equal(quests[1].deadline, null);
  assert.equal(quests[1].rolling, true);
});

test('tab-separated table with no header: columns are guessed', () => {
  const text = [
    'Alpha Bank\tSummer Analyst Programme\t01/09/2026\t30/11/2026\tYes\tNo',
    'Beta Capital\tGlobal Markets Off-Cycle Internship\t15/09/2026\t12/12/2026\tYes\tYes',
    'Gamma Partners\tGraduate Analyst\t20/09/2026\t\tYes\tNo',
  ].join('\n');
  const quests = gridToQuests(textToGrid(text), options);
  assert.deepEqual(quests.map((q) => [q.company, q.role, q.type, q.deadline]), [
    ['Alpha Bank', 'Summer Analyst Programme', 'summer', '2026-11-30'],
    ['Beta Capital', 'Global Markets Off-Cycle Internship', 'off-cycle', '2026-12-12'],
    ['Gamma Partners', 'Graduate Analyst', 'grad', null],
  ]);
  assert.equal(quests[1].division, 'Markets');
});

test('a data row that mentions "programme" is not mistaken for a header', () => {
  const quests = gridToQuests(textToGrid('Alpha Bank\tSummer Analyst Programme\t30/11/2026'), options);
  assert.equal(quests.length, 1);
  assert.equal(quests[0].company, 'Alpha Bank');
});

test('links attached to cells (from an HTML table) are used', () => {
  const grid = [
    [{ text: 'Company', link: null }, { text: 'Role', link: null }, { text: 'Deadline', link: null }],
    [{ text: 'Alpha Bank', link: null }, { text: 'Summer Analyst', link: 'https://alpha.example/job/1' }, { text: '30 Nov 2026', link: null }],
  ];
  assert.equal(gridToQuests(grid, options)[0].link, 'https://alpha.example/job/1');
});

test('one opportunity per line', () => {
  const text = [
    'Alpha Bank - 2027 Summer Analyst - Markets - closes 30 Nov 2026 - https://alpha.example/apply',
    'Beta Capital – Spring Week – rolling',
    'Summer Analyst at Gamma Partners',
  ].join('\n');
  const quests = parsePaste({ text, html: '' }, options);
  assert.equal(quests.length, 3);
  assert.deepEqual([quests[0].company, quests[0].role, quests[0].deadline, quests[0].link], ['Alpha Bank', '2027 Summer Analyst - Markets', '2026-11-30', 'https://alpha.example/apply']);
  assert.equal(quests[0].division, 'Markets');
  assert.deepEqual([quests[1].company, quests[1].role, quests[1].type, quests[1].rolling], ['Beta Capital', 'Spring Week', 'spring-week', true]);
  assert.deepEqual([quests[2].company, quests[2].role], ['Gamma Partners', 'Summer Analyst']);
});

test('blocks of lines separated by blank lines (copied job cards)', () => {
  const text = `Alpha Bank
Investment Banking Summer Internship 2027
London
Deadline: 30 November 2026
Apply now

Beta Capital
Asset Management Spring Week
Edinburgh
Opens 1 Oct 2026
Rolling deadline
https://beta.example/spring`;
  const quests = parseBlocks(text, options);
  assert.equal(quests.length, 2);
  assert.deepEqual(quests[0], { company: 'Alpha Bank', role: 'Investment Banking Summer Internship 2027', type: 'summer', division: 'Investment Banking', deadline: '2026-11-30', rolling: false, link: '' });
  assert.equal(quests[1].deadline, null); // an opening date is not a deadline
  assert.equal(quests[1].rolling, true);
  assert.equal(quests[1].link, 'https://beta.example/spring');
});

test('empty or useless input gives no quests', () => {
  assert.deepEqual(parsePaste({ text: '', html: '' }, options), []);
  assert.deepEqual(parsePaste({ text: '   \n\n  ', html: '' }, options), []);
});

test('CSV parsing handles quotes, commas and blank lines', () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","say ""hi"""\n\n1,2\n'), [['a', 'b'], ['x, y', 'say "hi"'], ['1', '2']]);
  assert.deepEqual(parseCsv('a;b\r\n1;2'), [['a', 'b'], ['1', '2']]);
});

test('the CSV template imports cleanly', () => {
  const quests = csvToQuests(CSV_TEMPLATE, options);
  assert.deepEqual(quests, [
    { company: 'Example Bank', role: '2027 Summer Analyst - Investment Banking', type: 'summer', division: 'Investment Banking', deadline: '2026-11-30', rolling: true, link: 'https://example.com/apply' },
    { company: 'Example Asset Managers', role: 'Spring Insight Week', type: 'spring-week', division: 'Asset Management', deadline: '2027-01-15', rolling: false, link: 'https://example.com/spring' },
  ]);
});

import { buildLogger } from './logger';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const isVerbose = process.argv.map((n) => n.toLowerCase()).includes('--verbose');
const orgName = 'osamhack2022';

export const logger = buildLogger({
  level: isVerbose ? 'silly' : undefined,
});

if (!process.env.GITHUB_TOKEN?.trim()) {
  logger.error('Fatal error: github token missing');
  process.exit(1);
}
const token = process.env.GITHUB_TOKEN;

axios.defaults.baseURL = 'https://api.github.com';
axios.defaults.headers.common = {
  ...axios.defaults.headers.common,
  Accept: 'application/vnd.github+json',
  Authorization: 'Bearer ' + token,
};

const knownBoys = process.env.KNOWN_BOYS?.trim().split(',') ?? [];

(async () => {
  let page = 1;
  const members = [];

  const followings = [];
  const followers = [];

  const me = (await axios.get('/user')).data;
  const myId = me.id;

  page = 1;
  while (true) {
    const res = await axios.get('/user/followers?per_page=100&page=' + page);

    followers.push(...res.data);
    if (res.data.length === 0) {
      break;
    }
    page++;
  }

  page = 1;
  while (true) {
    const res = await axios.get('/user/following?per_page=100&page=' + page);

    followings.push(...res.data);
    if (res.data.length === 0) {
      break;
    }
    page++;
  }

  page = 1;
  while (true) {
    const res = await axios.get('/orgs/' + orgName + '/members?per_page=100&page=' + page);

    members.push(...res.data);
    if (res.data.length === 0) {
      break;
    }
    page++;
  }

  const followingIds = followings.map((n) => n.id);
  const followerIds = followers.map((n) => n.id);

  const matchedFollowings = members.filter((n) => followingIds.includes(n.id));
  const matchedFollowers = members.filter((n) => followerIds.includes(n.id));

  console.log('following', matchedFollowings);
  console.log('followers', matchedFollowers);

  const mogakCodeNetwork = [];
  for (const knownBoy of knownBoys) {
    console.log('fetching for ', knownBoy);
    const username = knownBoy.trim();

    page = 1;
    while (true) {
      const res = await axios.get('/users/' + username + '/followers?per_page=100&page=' + page);
      if (res.data.length === 0) {
        break;
      }

      mogakCodeNetwork.push(...(res.data as any[]).filter((n) => n.id !== myId).map((n) => ({ ...n, via: username })));
      page++;
    }

    page = 1;
    while (true) {
      const res = await axios.get('/users/' + username + '/following?per_page=100&page=' + page);
      if (res.data.length === 0) {
        break;
      }

      mogakCodeNetwork.push(...(res.data as any[]).filter((n) => n.id !== myId).map((n) => ({ ...n, via: username })));
      page++;
    }
  }

  const memberIds = members.map((n) => n.id);
  const matchedMogakCodes = mogakCodeNetwork.filter((n) => memberIds.includes(n.id));

  console.log('모각코', matchedMogakCodes);

  fs.writeFileSync(
    'result.json',
    JSON.stringify(
      {
        followings: matchedFollowings,
        followers: matchedFollowers,
        mogakCode: matchedMogakCodes,
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    'raw.json',
    JSON.stringify(
      {
        followings,
        followers,
        mogakCode: mogakCodeNetwork,
      },
      null,
      2,
    ),
  );
})();

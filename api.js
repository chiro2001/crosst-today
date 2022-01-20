const GitHub = require('github-api')
require('dotenv').config()

let _gh = null;

const getGh = (token) => {
  return _gh || new GitHub({
    token: token
  });
};

async function getGitHubData(token) {
  const gh = getGh(token);

  let data = {};
  let me = gh.getUser();
  let repos = await me.listRepos();
  data.repos = repos.data;
  return data
}

let githubData = [];
let lastUpdateCommitSha = null;
const repoName = process.env.GITHUB_REPO;

async function getTreeContent(repo, itemList, treeFilter) {
  const blobSuffix = '.yml';
  if (!itemList) return [];
  let list = [];
  for (const item of itemList) {
    if (treeFilter && treeFilter !== item.path) continue;
    console.log('item', item);
    if (item.type === "tree") {
      const treeDataNew = await repo.getTree(item.sha);
      if (treeDataNew.status !== 200) continue;
      list = list.concat(await getTreeContent(repo, treeDataNew.data.tree));
    }
    else if (item.type === "blob") {
      if (!item.path.endsWith(blobSuffix)) continue;
      const blobData = await repo.getBlob(item.sha);
      list.push(blobData);
    }
  }
  return list;
}

async function updateGithubData(token) {
  const gh = getGh(token);
  console.log("test start");
  // const me = gh.getUser();
  const repo = await gh.getRepo(repoName);
  const commits = await repo.listCommits();
  const commitLastest = commits.data[commits.data.length - 1];
  const commitSha = commitLastest.sha;
  if (lastUpdateCommitSha === commitSha) return githubData;
  lastUpdateCommitSha = commitSha;
  const treeData = await repo.getTree(commitSha);
  const treeContent = await getTreeContent(repo, treeData.data.tree, 'posts');
}

async function dataFilter(data) {
  return data;
}

module.exports = { getGitHubData, updateGithubData }
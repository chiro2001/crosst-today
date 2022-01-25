const GitHub = require('github-api')
const calendar = require('./calendar');
const YAML = require('yamljs');
const { isNumber } = require('underscore');
require('dotenv').config();

let _gh = null;

/**
 * 获得缓存的GitHub API
 * @param {String} token 
 * @returns {GitHub}
 */
const getGh = (token) => {
  return _gh || new GitHub({
    token: token
  });
};

/**
 * For test
 * @param {String} token 
 * @returns {Array} 
 */
async function getGitHubData(token) {
  const gh = getGh(token);

  let data = {};
  let me = gh.getUser();
  let repos = await me.listRepos();
  data.repos = repos.data;
  return data;
}

const isIterable = obj => obj != null && typeof obj[Symbol.iterator] === 'function';
const isObject = obj => Object.prototype.toString.call(obj) === '[object Object]';
/**
 * 替换字典中的key名称，并且加上type_*
 * @param {Object} data 
 * @returns 
 */
function replaceKey(data) {
  if (!data || isIterable(data)) return data;
  for (const key in data) {
    const val = replaceKey(data[key]);
    const keyNew = key.replace('-', '_');
    delete data[key];
    data[keyNew] = val;
    if (key === 'type')
      data[`type_${val}`] = true;
  }
  return data;
}

let githubData = [];
let lastUpdateCommitSha = null;
let lastUpdateTime = null;
const minUpdateTime = 5 * 60 * 1000;
const repoName = process.env.GITHUB_REPO;

/**
 * 获取仓库的文件树数据
 * @param {Repo} repo 
 * @param {Array} itemList 
 * @param {String} treeFilter 
 * @returns {Array}
 */
async function getTreeContent(repo, itemList, treeFilter, pathPrefix) {
  const blobSuffix = '.yml';
  if (!itemList) return [];
  let list = [];
  for (const item of itemList) {
    if (treeFilter && treeFilter !== item.path) continue;
    if (item.type === "tree") {
      const treeDataNew = await repo.getTree(item.sha);
      if (treeDataNew.status !== 200) continue;
      list = list.concat(await getTreeContent(repo, treeDataNew.data.tree, null, pathPrefix + '-' + item.path));
    }
    else if (item.type === "blob") {
      if (!item.path.endsWith(blobSuffix)) continue;
      const blobData = await repo.getBlob(item.sha);
      const data = YAML.parse(blobData.data);
      list.push({
        path: (pathPrefix || "") + '-' + item.path,
        data: replaceKey(data)
      });
    }
  }
  return list;
}

/**
 *更新并且获取需要显示的数据
 * @param {String} token 
 * @returns {Array}
 */
async function updateGithubData(token) {
  const gh = getGh(token);
  const now = new Date();
  if (lastUpdateTime && githubData && now.getTime() - lastUpdateTime > minUpdateTime) return githubData;
  const repo = await gh.getRepo(repoName);
  const commits = await repo.listCommits();
  const commitLastest = commits.data[0];
  const commitSha = commitLastest.sha;
  if (lastUpdateCommitSha === commitSha) return githubData;
  lastUpdateCommitSha = commitSha;
  // console.log("commit sha =", commitSha);
  const treeData = await repo.getTree(commitSha);
  const contentList = await getTreeContent(repo, treeData.data.tree, 'posts');
  // for (const item of contentList) {
  //   console.log(item.path, 'done');
  // }
  console.log('before', githubData);
  githubData = dataListFilter(contentList);
  console.log('after', githubData);
  return githubData;
}

/**
 * 过滤需要显示的数据条目
 * @param {Array} list 
 * @returns {Array}
 */
async function dataListFilter(list) {
  const now = new Date();
  return list.filter(x => {
    // 有date字段的，匹配日期显示，否则按路径匹配
    const date = x.data.data.date && x.path;
    if (date) {
      const splitsRaw = date.split("-").slice(0, 3);
      const splits = isNumber(splitsRaw[2]) ? splitsRaw : splitsRaw.slice(1, 3);
      if (splits.length === 2 && Number(splits[0]) === now.getMonth() + 1 && Number(splits[1]) === now.getDate()) return true;
      if (splits.length === 3 && Number(splits[0]) === now.getFullYear() && Number(splits[1]) === now.getMonth() + 1 && Number(splits[2]) === now.getDate()) return true;
    }
    return false;
  });
}

/**
 * 获取需要显示的时间信息
 * @returns {Object}
 */
function getDateInfo() {
  const date = new Date();
  const weekCn = '日一二三四五六';
  const lc = calendar.solar2lunar();
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    week: weekCn[date.getDay()],
    lc_year: `${lc.gzYear}${lc.Animal}`,
    lc_date: `${lc.IMonthCn}${lc.IDayCn}`
  }
}

module.exports = { getGitHubData, updateGithubData, getDateInfo }
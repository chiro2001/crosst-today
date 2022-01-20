const GitHub = require('github-api')

async function getGitHubData(token) {
  let gh = new GitHub({
    token: token
  })

  let data = {}
  let me = gh.getUser()
  let repos = await me.listRepos()
  data.repos = repos.data
  return data
}

module.exports = getGitHubData
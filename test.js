const { getGitHubData, updateGithubData } = require('./api')

const token = "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";

const main = async () => {
  await updateGithubData(token);
};

main();
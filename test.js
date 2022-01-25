const { getGitHubData, updateGithubData } = require('./api')

const token = "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";

const main = async () => {
  await updateGithubData(token);
};

main();
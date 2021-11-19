const { request } = require("./common/utils");
const retryer = require("./common/retryer");
const core = require('@actions/core')

// require("dotenv").config();

const fetcher = (/* variables, token */) => {
  return request(
    {
      query: `
      {
        user(login: "${core.getInput('user')}") {
          repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
            nodes {
              name
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
        }
      }
      `
      // ,variables,
    },
    {
      Authorization: `bearer ${core.getInput('gh_token')}`,
    },
  );
};

async function fetchTopLanguages(username) {
  if (!username) throw Error("Invalid username");

  // const res = await retryer(fetcher).then(resp => {
  //   console.log("resp from res in fetch lang ", resp)
  //   return resp
  // });

  const res = await fetcher().then(res=>{
    // console.log("response from fetch lang ", res.data)
    return res
  })

  // console.log(res)

  // if (res.data.errors) {
  //   console.error(res.data.errors);
  //   throw Error(res.data.errors[0].message || "Could not fetch user");
  // }

  let repoNodes = res.data.data.user.repositories.nodes;
  let repoToHide = {};

  // filter out repositories to be hidden
  repoNodes = repoNodes
    .sort((a, b) => b.size - a.size)
    .filter((name) => {
      return !repoToHide[name.name];
    });

  repoNodes = repoNodes
    .filter((node) => {
      return node.languages.edges.length > 0;
    })
    // flatten the list of language nodes
    .reduce((acc, curr) => curr.languages.edges.concat(acc), [])
    .reduce((acc, prev) => {
      // get the size of the language (bytes)
      let langSize = prev.size;

      // if we already have the language in the accumulator
      // & the current language name is same as previous name
      // add the size to the language size.
      if (acc[prev.node.name] && prev.node.name === acc[prev.node.name].name) {
        langSize = prev.size + acc[prev.node.name].size;
      }
      return {
        ...acc,
        [prev.node.name]: {
          name: prev.node.name,
          color: prev.node.color,
          size: langSize,
        },
      };
    }, {});

  const topLangs = Object.keys(repoNodes)
    .sort((a, b) => repoNodes[b].size - repoNodes[a].size)
    .reduce((result, key) => {
      result[key] = repoNodes[key];
      return result;
    }, {});

  return topLangs;
}

module.exports = fetchTopLanguages;
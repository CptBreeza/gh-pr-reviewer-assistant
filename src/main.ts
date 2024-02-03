import * as core from "@actions/core";
import { Octokit } from "@octokit/core";
import { paginateGraphql } from "@octokit/plugin-paginate-graphql";
// import OpenAI from "openai";

const OctokitKlass = Octokit.plugin(paginateGraphql);

async function run() {
  try {
    // const openai_api_key = core.getInput("openai_api_key");
    const token = core.getInput("github_token");
    const pullRequestId = core.getInput("pull_request_id");
    const commentId = core.getInput("comment_id");

    const octokit = new OctokitKlass({ auth: token });
    const thread = await retrieveThread(octokit, pullRequestId, commentId);

    if (thread) {
      core.info("Get Info:");
      core.info(thread.map((c) => `${c.author}: ${c.body}`).join());
    } else {
      core.setFailed("Cannot retrieve thread.");
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

interface PRReviewThreadsResponse {
  PRReviewThreads: {
    node: {
      reviewThreads: {
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string;
        };
        edges: Array<{
          node: {
            comments: {
              nodes: Array<{
                id: string;
                body: string;
                author: {
                  login: string;
                };
              }>;
            };
          };
        }>;
      };
    };
  };
}

async function retrieveThread(
  octokit: InstanceType<typeof OctokitKlass>,
  pullRequestId: string,
  commentId: string,
): Promise<Array<{ author: string; body: string }> | undefined> {
  const document = `
    query PRReviewThreads(
      $pullReqestId: ID!
      $num: Int = 10
      $cursor: String
    ) {
      node(id: $pullReqestId) {
        ... on PullRequest {
          reviewThreads(first: $num, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                ... on PullRequestReviewThread {
                  comments(first: 100) {
                    nodes {
                      ... on PullRequestReviewComment {
                        id
                        body
                        author {
                          login
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    `;

  const {
    PRReviewThreads: {
      node: { reviewThreads: { edges: reviewThreadsEdges } },
    },
  } = await octokit.graphql.paginate<PRReviewThreadsResponse>(document, {
    pullRequestId,
  });

  return reviewThreadsEdges
    .find((e) => {
      e.node.comments.nodes.some((c) => c.id === commentId);
    })?.node.comments.nodes.map((c) => {
      return {
        author: c.author.login,
        body: c.body,
      };
    });
}

run();

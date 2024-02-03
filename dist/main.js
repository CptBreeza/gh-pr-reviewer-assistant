"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const core_1 = require("@octokit/core");
const plugin_paginate_graphql_1 = require("@octokit/plugin-paginate-graphql");
// import OpenAI from "openai";
const OctokitKlass = core_1.Octokit.plugin(plugin_paginate_graphql_1.paginateGraphql);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // const openai_api_key = core.getInput("openai_api_key");
            const token = core.getInput("github_token");
            const pullRequestId = core.getInput("pull_request_id");
            const commentId = core.getInput("comment_id");
            const octokit = new OctokitKlass({ auth: token });
            const thread = yield retrieveThread(octokit, pullRequestId, commentId);
            if (thread) {
                core.info("Get Info:");
                core.info(thread.map((c) => `${c.author}: ${c.body}`).join());
            }
            else {
                core.setFailed("Cannot retrieve thread.");
            }
        }
        catch (error) {
            if (error instanceof Error) {
                core.setFailed(error.message);
            }
        }
    });
}
function retrieveThread(octokit, pullRequestId, commentId) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
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
        const { PRReviewThreads: { node: { reviewThreads: { edges: reviewThreadsEdges } }, }, } = yield octokit.graphql.paginate(document, {
            pullRequestId,
        });
        return (_a = reviewThreadsEdges
            .find((e) => {
            e.node.comments.nodes.some((c) => c.id === commentId);
        })) === null || _a === void 0 ? void 0 : _a.node.comments.nodes.map((c) => {
            return {
                author: c.author.login,
                body: c.body,
            };
        });
    });
}
run();

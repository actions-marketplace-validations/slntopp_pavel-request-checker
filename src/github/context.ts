import * as github from '@actions/github';

export interface PullRequestContext {
  number: number;
  title: string;
  draft: boolean;
  author: string;
  isBot: boolean;
  owner: string;
  repo: string;
}

export function extractPullRequest(): PullRequestContext | null {
  const ctx = github.context;
  if (ctx.eventName !== 'pull_request' && ctx.eventName !== 'pull_request_target') {
    return null;
  }
  const pr = ctx.payload.pull_request;
  if (!pr) return null;
  const login: string = pr.user?.login ?? '';
  return {
    number: pr.number,
    title: pr.title ?? '',
    draft: Boolean(pr.draft),
    author: login,
    isBot: pr.user?.type === 'Bot' || login.endsWith('[bot]'),
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
  };
}
